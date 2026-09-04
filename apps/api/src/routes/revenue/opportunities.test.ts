import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { prisma } from "@commerceos/database";

const app = buildApp();

async function registerMerchant(name: string, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      name,
      email,
      password: "password123",
      merchantName: `${name} Store`,
    },
  });
  return res.json();
}

async function createProductWithVariant(token: string, productName: string, sku: string, price: number, stock: number) {
  const pRes = await app.inject({
    method: "POST",
    url: "/products",
    headers: { authorization: `Bearer ${token}` },
    payload: { name: productName },
  });
  const product = pRes.json().product;

  const vRes = await app.inject({
    method: "POST",
    url: `/products/${product.id}/variants`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: `${productName} Variant`,
      sku,
      price,
      currency: "INR",
      quantity: stock,
    },
  });
  const variant = vRes.json().variant;

  return { product, variant };
}

async function createAndPayOrder(token: string, items: Array<{ variantId: string; quantity: number }>) {
  const oRes = await app.inject({
    method: "POST",
    url: "/orders",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      customer: { name: "Test Buyer", email: "buyer@example.com" },
      items,
    },
  });
  const order = oRes.json().order;
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });
  return order;
}

describe("Revenue Opportunities Engine", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("detects LOW_STOCK opportunities with HIGH and MEDIUM priority", async () => {
    const merchant = await registerMerchant("LowStock Merchant", `lowstock-${Date.now()}@example.com`);
    const token = merchant.token;

    // Variant 1: Available = 2 (<= 2 -> HIGH priority), with sales
    const { variant: vHigh } = await createProductWithVariant(
      token,
      "High Priority Shoe",
      `SKU-LS-HIGH-${Date.now()}`,
      200000,
      2
    );
    await createAndPayOrder(token, [{ variantId: vHigh.id, quantity: 1 }]);

    // Variant 2: Available = 4 (3..5 -> MEDIUM priority), with sales
    const { variant: vMed } = await createProductWithVariant(
      token,
      "Med Priority Shoe",
      `SKU-LS-MED-${Date.now()}`,
      200000,
      4
    );
    await createAndPayOrder(token, [{ variantId: vMed.id, quantity: 1 }]);

    // Variant 3: Low stock (available = 2) but NO sales -> Should NOT be a LOW_STOCK opportunity
    await createProductWithVariant(
      token,
      "No Sales Shoe",
      `SKU-LS-NOSALE-${Date.now()}`,
      200000,
      2
    );

    // Variant 4: Normal stock (available = 20) with sales -> Should NOT be a LOW_STOCK opportunity
    const { variant: vNormal } = await createProductWithVariant(
      token,
      "Normal Stock Shoe",
      `SKU-LS-NORM-${Date.now()}`,
      200000,
      20
    );
    await createAndPayOrder(token, [{ variantId: vNormal.id, quantity: 2 }]);

    const res = await app.inject({
      method: "GET",
      url: "/revenue/opportunities",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const opps = res.json().opportunities;
    const lowStockOpps = opps.filter((o: any) => o.type === "LOW_STOCK");

    expect(lowStockOpps.length).toBe(2);

    const highOpp = lowStockOpps.find((o: any) => o.data.variantId === vHigh.id);
    expect(highOpp).toBeDefined();
    expect(highOpp.priority).toBe("HIGH");
    expect(highOpp.recommendation).toContain("Restock");

    const medOpp = lowStockOpps.find((o: any) => o.data.variantId === vMed.id);
    expect(medOpp).toBeDefined();
    expect(medOpp.priority).toBe("MEDIUM");
  });

  it("detects HIGH_DEMAND opportunities when sales velocity meets threshold", async () => {
    const merchant = await registerMerchant("HighDemand Merchant", `highdemand-${Date.now()}@example.com`);
    const token = merchant.token;

    // Variant with 10 sales (>= 5 threshold, >= 10 -> HIGH priority)
    const { variant: vHot } = await createProductWithVariant(
      token,
      "Viral Hoodie",
      `SKU-HOT-${Date.now()}`,
      150000,
      50
    );
    await createAndPayOrder(token, [{ variantId: vHot.id, quantity: 10 }]);

    // Variant with 1 sale (< 5 threshold) -> Should NOT trigger HIGH_DEMAND
    const { variant: vSlow } = await createProductWithVariant(
      token,
      "Slow Cap",
      `SKU-SLOW-${Date.now()}`,
      50000,
      50
    );
    await createAndPayOrder(token, [{ variantId: vSlow.id, quantity: 1 }]);

    const res = await app.inject({
      method: "GET",
      url: "/revenue/opportunities",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const opps = res.json().opportunities;
    const highDemandOpps = opps.filter((o: any) => o.type === "HIGH_DEMAND");

    expect(highDemandOpps.length).toBe(1);
    expect(highDemandOpps[0].data.variantId === vHot.id).toBe(true);
    expect(highDemandOpps[0].priority).toBe("HIGH");
    expect(highDemandOpps[0].data.sales).toBe(10);
  });

  it("detects CROSS_SELL opportunities for products frequently purchased together", async () => {
    const merchant = await registerMerchant("CrossSell Merchant", `crosssell-${Date.now()}@example.com`);
    const token = merchant.token;

    const { product: prodShoes, variant: varShoes } = await createProductWithVariant(
      token,
      "Running Shoes",
      `SKU-SHOE-CS-${Date.now()}`,
      300000,
      50
    );

    const { product: prodSocks, variant: varSocks } = await createProductWithVariant(
      token,
      "Running Socks",
      `SKU-SOCK-CS-${Date.now()}`,
      40000,
      50
    );

    const { product: prodWater, variant: varWater } = await createProductWithVariant(
      token,
      "Water Bottle",
      `SKU-BOTTLE-CS-${Date.now()}`,
      20000,
      50
    );

    // Order 1: Shoes + Socks
    await createAndPayOrder(token, [
      { variantId: varShoes.id, quantity: 1 },
      { variantId: varSocks.id, quantity: 1 },
    ]);

    // Order 2: Shoes + Socks (Frequency = 2 -> meets default minOccurrence)
    await createAndPayOrder(token, [
      { variantId: varShoes.id, quantity: 1 },
      { variantId: varSocks.id, quantity: 2 },
    ]);

    // Order 3: Only Shoes + Water Bottle (Frequency = 1 < 2)
    await createAndPayOrder(token, [
      { variantId: varShoes.id, quantity: 1 },
      { variantId: varWater.id, quantity: 1 },
    ]);

    const res = await app.inject({
      method: "GET",
      url: "/revenue/opportunities",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const opps = res.json().opportunities;
    const crossSellOpps = opps.filter((o: any) => o.type === "CROSS_SELL");

    // Expect bundle opportunity between Running Shoes and Running Socks
    expect(crossSellOpps.length).toBe(1);
    expect(crossSellOpps[0].data.productIds).toContain(prodShoes.id);
    expect(crossSellOpps[0].data.productIds).toContain(prodSocks.id);
    expect(crossSellOpps[0].data.occurrences).toBe(2);
    expect(crossSellOpps[0].recommendation).toContain("bundle");
  });

  it("detects LOW_CONVERSION opportunities for products with 0 paid sales", async () => {
    const merchant = await registerMerchant("LowConv Merchant", `lowconv-${Date.now()}@example.com`);
    const token = merchant.token;

    // Product with 0 sales
    const { product: unlovedProd } = await createProductWithVariant(
      token,
      "Unsold Leather Belt",
      `SKU-BELT-${Date.now()}`,
      100000,
      20
    );

    // Product with sales
    const { variant: soldVar } = await createProductWithVariant(
      token,
      "Popular Belt",
      `SKU-POPBELT-${Date.now()}`,
      100000,
      20
    );
    await createAndPayOrder(token, [{ variantId: soldVar.id, quantity: 2 }]);

    const res = await app.inject({
      method: "GET",
      url: "/revenue/opportunities",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const opps = res.json().opportunities;
    const lowConvOpps = opps.filter((o: any) => o.type === "LOW_CONVERSION");

    const found = lowConvOpps.find((o: any) => o.data.productId === unlovedProd.id);
    expect(found).toBeDefined();
    expect(found.priority).toBe("LOW");
    expect(found.data.paidSales).toBe(0);
  });

  it("enforces multi-tenant isolation across all opportunity types", async () => {
    const merchantA = await registerMerchant("Merchant A", `opp-a-${Date.now()}@example.com`);
    const merchantB = await registerMerchant("Merchant B", `opp-b-${Date.now()}@example.com`);

    // Merchant A creates low stock item with sales
    const { variant: varA } = await createProductWithVariant(
      merchantA.token,
      "Merchant A Exclusive",
      `SKU-A-${Date.now()}`,
      50000,
      2
    );
    await createAndPayOrder(merchantA.token, [{ variantId: varA.id, quantity: 1 }]);

    // Merchant B has NO products or orders
    const resB = await app.inject({
      method: "GET",
      url: "/revenue/opportunities",
      headers: { authorization: `Bearer ${merchantB.token}` },
    });

    expect(resB.statusCode).toBe(200);
    const oppsB = resB.json().opportunities;
    expect(oppsB).toEqual([]);
  });
});
