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

describe("Revenue Analytics Backend", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("requires authentication", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/revenue/analytics",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns comprehensive revenue analytics including periods, top items, and conversion", async () => {
    const merchant = await registerMerchant("Analytics Store", `analytics-${Date.now()}@example.com`);
    const token = merchant.token;

    const { product: prod1, variant: var1 } = await createProductWithVariant(
      token,
      "Super Running Shoes",
      `SKU-RUN-${Date.now()}`,
      200000,
      50
    );

    const { product: prod2, variant: var2 } = await createProductWithVariant(
      token,
      "Performance Socks",
      `SKU-SOCK-${Date.now()}`,
      50000,
      100
    );

    // Create order 1 (Paid)
    const o1Res = await app.inject({
      method: "POST",
      url: "/orders",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customer: { name: "Buyer 1", email: "b1@example.com" },
        items: [
          { variantId: var1.id, quantity: 2 }, // 400000
          { variantId: var2.id, quantity: 1 }, // 50000
        ],
      },
    });
    const order1 = o1Res.json().order;
    await prisma.order.update({
      where: { id: order1.id },
      data: { status: "PAID" },
    });

    // Create order 2 (Paid)
    const o2Res = await app.inject({
      method: "POST",
      url: "/orders",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customer: { name: "Buyer 2", email: "b2@example.com" },
        items: [{ variantId: var2.id, quantity: 3 }], // 150000
      },
    });
    const order2 = o2Res.json().order;
    await prisma.order.update({
      where: { id: order2.id },
      data: { status: "PAID" },
    });

    // Create order 3 (Pending payment - unpaid)
    await app.inject({
      method: "POST",
      url: "/orders",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customer: { name: "Buyer 3", email: "b3@example.com" },
        items: [{ variantId: var1.id, quantity: 1 }],
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/revenue/analytics",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    const analytics = body.analytics;

    // Overview assertions
    // Order 1: 450000, Order 2: 150000 = total 600000
    expect(analytics.overview.totalRevenue).toBe(600000);
    expect(analytics.overview.totalOrders).toBe(3);
    expect(analytics.overview.paidOrders).toBe(2);
    expect(analytics.overview.averageOrderValue).toBe(300000);
    expect(analytics.overview.unitsSold).toBe(6); // 2 + 1 + 3
    expect(analytics.overview.conversionRate).toBe(66.67); // 2/3 * 100

    // Periods
    expect(analytics.revenueByDay.length).toBeGreaterThan(0);
    expect(analytics.revenueByWeek.length).toBeGreaterThan(0);
    expect(analytics.revenueByMonth.length).toBeGreaterThan(0);
    expect(analytics.ordersByDay.length).toBeGreaterThan(0);

    // Top products
    expect(analytics.topProducts.length).toBe(2);
    expect(analytics.topProducts[0].name).toBe("Super Running Shoes");
    expect(analytics.topProducts[0].revenue).toBe(400000);
    expect(analytics.topProducts[0].unitsSold).toBe(2);

    expect(analytics.topProducts[1].name).toBe("Performance Socks");
    expect(analytics.topProducts[1].revenue).toBe(200000);
    expect(analytics.topProducts[1].unitsSold).toBe(4);

    // Top variants
    expect(analytics.topVariants.length).toBe(2);
  });

  it("strictly isolates analytics between different merchants", async () => {
    const merchantA = await registerMerchant("Merchant Alpha", `alpha-${Date.now()}@example.com`);
    const merchantB = await registerMerchant("Merchant Beta", `beta-${Date.now()}@example.com`);

    const { variant: varA } = await createProductWithVariant(
      merchantA.token,
      "Alpha Product",
      `SKU-ALPHA-${Date.now()}`,
      100000,
      10
    );

    const oRes = await app.inject({
      method: "POST",
      url: "/orders",
      headers: { authorization: `Bearer ${merchantA.token}` },
      payload: {
        customer: { name: "Cust Alpha", email: "ca@example.com" },
        items: [{ variantId: varA.id, quantity: 2 }],
      },
    });
    const order = oRes.json().order;
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });

    // Merchant B checks their analytics
    const resB = await app.inject({
      method: "GET",
      url: "/revenue/analytics",
      headers: { authorization: `Bearer ${merchantB.token}` },
    });

    expect(resB.statusCode).toBe(200);
    const analyticsB = resB.json().analytics;

    // Merchant B must see 0 revenue and 0 orders
    expect(analyticsB.overview.totalRevenue).toBe(0);
    expect(analyticsB.overview.totalOrders).toBe(0);
    expect(analyticsB.overview.paidOrders).toBe(0);
    expect(analyticsB.topProducts).toEqual([]);
    expect(analyticsB.topVariants).toEqual([]);
  });
});
