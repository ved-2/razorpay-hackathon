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

async function createProductWithVariant(
  token: string,
  productName: string,
  sku: string,
  price: number,
  stock: number
) {
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

async function createAndPayOrder(
  token: string,
  items: Array<{ variantId: string; quantity: number }>
) {
  const oRes = await app.inject({
    method: "POST",
    url: "/orders",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      customer: { name: "Buyer AI", email: "ai-buyer@example.com" },
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

describe("AI Proposal API (POST /ai/opportunities/:id/propose)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("requires authentication", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/ai/opportunities/opp_123/propose",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 404 for a non-existent opportunity ID", async () => {
    const merchant = await registerMerchant(
      "AI Store 1",
      `aistore1-${Date.now()}@example.com`
    );

    const res = await app.inject({
      method: "POST",
      url: "/ai/opportunities/non_existent_opp/propose",
      headers: { authorization: `Bearer ${merchant.token}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Opportunity not found");
  });

  it("generates a structured AI proposal through LangGraph for an active opportunity", async () => {
    const merchant = await registerMerchant(
      "Propose Store",
      `propstore-${Date.now()}@example.com`
    );
    const token = merchant.token;

    // Create a low stock item with sales to generate a LOW_STOCK opportunity
    const { variant } = await createProductWithVariant(
      token,
      "Agentic Marathon Sneaker",
      `SKU-PROP-${Date.now()}`,
      249900,
      2 // available = 2
    );
    await createAndPayOrder(token, [{ variantId: variant.id, quantity: 1 }]);

    // 1. Fetch the generated opportunity
    const oppRes = await app.inject({
      method: "GET",
      url: "/revenue/opportunities",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(oppRes.statusCode).toBe(200);

    const opportunities = oppRes.json().opportunities;
    const targetOpp = opportunities.find(
      (o: any) => o.type === "LOW_STOCK" && o.data.variantId === variant.id
    );
    expect(targetOpp).toBeDefined();

    // 2. Propose action via AI endpoint
    const proposeRes = await app.inject({
      method: "POST",
      url: `/ai/opportunities/${targetOpp.id}/propose`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(proposeRes.statusCode).toBe(200);
    const body = proposeRes.json();

    expect(body.proposal).toBeDefined();
    expect(body.proposal.action).toBe("RESTOCK");
    expect(body.proposal.quantity).toBeGreaterThan(0);
    expect(body.proposal.title).toContain("Restock");
    expect(body.proposal.confidence).toBeGreaterThan(0.8);
    expect(body.proposal.expectedImpact).toBeDefined();

    // Context should be captured
    expect(body.context).toBeDefined();
    expect(body.context.storeOverview).toBeDefined();
  }, 20000);

  it("enforces tenant isolation: Merchant B cannot propose on Merchant A's opportunity", async () => {
    const merchantA = await registerMerchant(
      "Merchant A AI",
      `merch-a-${Date.now()}@example.com`
    );
    const merchantB = await registerMerchant(
      "Merchant B AI",
      `merch-b-${Date.now()}@example.com`
    );

    const { variant } = await createProductWithVariant(
      merchantA.token,
      "Merchant A Exclusive Shoes",
      `SKU-ISO-${Date.now()}`,
      199900,
      1
    );
    await createAndPayOrder(merchantA.token, [{ variantId: variant.id, quantity: 1 }]);

    // Get Merchant A's opportunity
    const oppResA = await app.inject({
      method: "GET",
      url: "/revenue/opportunities",
      headers: { authorization: `Bearer ${merchantA.token}` },
    });
    const oppA = oppResA.json().opportunities[0];
    expect(oppA).toBeDefined();

    // Merchant B attempts to propose on Merchant A's opportunity
    const proposeResB = await app.inject({
      method: "POST",
      url: `/ai/opportunities/${oppA.id}/propose`,
      headers: { authorization: `Bearer ${merchantB.token}` },
    });

    // Must be rejected as 404 (not found for Merchant B)
    expect(proposeResB.statusCode).toBe(404);
    expect(proposeResB.json().error).toBe("Opportunity not found");
  });
});
