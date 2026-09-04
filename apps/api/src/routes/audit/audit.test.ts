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

describe("Audit Trail Backend (GET /audit)", () => {
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
      url: "/audit",
    });
    expect(res.statusCode).toBe(401);
  });

  it("traces the full operational chain: POLICY_CHECKED -> APPROVAL_CREATED -> APPROVAL_APPROVED -> ACTION_EXECUTED", async () => {
    const merchant = await registerMerchant(
      "Audit Chain Store",
      `audit-${Date.now()}@example.com`
    );
    const token = merchant.token;

    const { variant } = await createProductWithVariant(
      token,
      "Audited Shoe",
      `SKU-AUDIT-${Date.now()}`,
      250000,
      5
    );

    // 1. Create approval -> records POLICY_CHECKED and APPROVAL_CREATED
    const createRes = await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Restock Audited Shoe",
          reason: "Replenish running shoe",
          quantity: 20,
          targetVariantId: variant.id,
          expectedImpact: "Prevent stockouts",
          confidence: 0.95,
        },
      },
    });
    expect(createRes.statusCode).toBe(201);
    const approvalId = createRes.json().approval.id;

    // 2. Approve -> records APPROVAL_APPROVED and ACTION_EXECUTED
    const approveRes = await app.inject({
      method: "POST",
      url: `/approvals/${approvalId}/approve`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(approveRes.statusCode).toBe(200);

    // 3. Fetch audit trail
    const auditRes = await app.inject({
      method: "GET",
      url: "/audit",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(auditRes.statusCode).toBe(200);

    const events = auditRes.json().events;
    expect(events.length).toBeGreaterThanOrEqual(4);

    const actions = events.map((e: any) => e.action);
    expect(actions).toContain("POLICY_CHECKED");
    expect(actions).toContain("APPROVAL_CREATED");
    expect(actions).toContain("APPROVAL_APPROVED");
    expect(actions).toContain("ACTION_EXECUTED");

    // Verify Action Executed details
    const executedEvent = events.find((e: any) => e.action === "ACTION_EXECUTED");
    expect(executedEvent.entity).toBe("ActionExecutor");
    expect(executedEvent.metadata.addedQuantity).toBe(20);
    expect(executedEvent.metadata.newQuantity).toBe(25);
  });

  it("filters audit trail by action and entity", async () => {
    const merchant = await registerMerchant(
      "Audit Filter Store",
      `audit-filter-${Date.now()}@example.com`
    );
    const token = merchant.token;

    // Trigger policy check + approval created
    await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        proposal: {
          action: "DISCOUNT",
          title: "Promo 10%",
          reason: "Promo",
          discountPercent: 10,
          expectedImpact: "Sales",
          confidence: 0.85,
        },
      },
    });

    const filterRes = await app.inject({
      method: "GET",
      url: "/audit?action=APPROVAL_CREATED",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(filterRes.statusCode).toBe(200);
    const events = filterRes.json().events;
    expect(events.length).toBe(1);
    expect(events[0].action).toBe("APPROVAL_CREATED");
  });

  it("enforces tenant isolation: Merchant B cannot view Merchant A's audit events", async () => {
    const merchantA = await registerMerchant(
      "Audit A",
      `audit-a-${Date.now()}@example.com`
    );
    const merchantB = await registerMerchant(
      "Audit B",
      `audit-b-${Date.now()}@example.com`
    );

    // Merchant A creates an approval
    await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${merchantA.token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Restock A",
          reason: "Internal demand",
          quantity: 10,
          expectedImpact: "A only",
          confidence: 0.9,
        },
      },
    });

    // Merchant B inspects audit trail
    const resB = await app.inject({
      method: "GET",
      url: "/audit",
      headers: { authorization: `Bearer ${merchantB.token}` },
    });

    expect(resB.statusCode).toBe(200);
    const eventsB = resB.json().events;
    expect(eventsB).toEqual([]);
  });
});
