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

describe("Approvals & Action Execution Engine", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("requires authentication for approvals endpoints", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/approvals",
    });
    expect(res.statusCode).toBe(401);
  });

  it("blocks approval creation if proposal violates merchant policy", async () => {
    const merchant = await registerMerchant(
      "Approval Policy Store",
      `app-policy-${Date.now()}@example.com`
    );

    const res = await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${merchant.token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Over-the-limit Restock",
          reason: "Too much stock requested",
          quantity: 200, // exceeds default policy of 50
          expectedImpact: "Excess inventory",
          confidence: 0.9,
        },
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toContain("blocked by policy engine");
    expect(body.violations.length).toBeGreaterThan(0);
  });

  it("creates a PENDING approval for a policy-compliant proposal", async () => {
    const merchant = await registerMerchant(
      "Compliant Store",
      `comp-${Date.now()}@example.com`
    );

    const res = await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${merchant.token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Restock Sneakers",
          reason: "Demand is high",
          quantity: 20, // <= 50
          expectedImpact: "Prevent stockouts",
          confidence: 0.92,
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.approval.status).toBe("PENDING");
    expect(body.approval.type).toBe("RESTOCK");
    expect(body.evaluation.allowed).toBe(true);
  });

  it("executes RESTOCK action upon merchant approval and updates physical inventory", async () => {
    const merchant = await registerMerchant(
      "Execution Store",
      `exec-${Date.now()}@example.com`
    );
    const token = merchant.token;

    const { variant } = await createProductWithVariant(
      token,
      "Air Sprint Runners",
      `SKU-EXEC-${Date.now()}`,
      299900,
      10 // initial stock = 10
    );

    // 1. Create compliant approval for 25 units
    const createRes = await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Restock Air Sprint Runners",
          reason: "Inventory reaching depletion point",
          quantity: 25,
          targetVariantId: variant.id,
          expectedImpact: "Maintain sales continuity",
          confidence: 0.94,
        },
      },
    });
    expect(createRes.statusCode).toBe(201);
    const approvalId = createRes.json().approval.id;

    // 2. Merchant approves the action
    const approveRes = await app.inject({
      method: "POST",
      url: `/approvals/${approvalId}/approve`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(approveRes.statusCode).toBe(200);
    const approveBody = approveRes.json();
    expect(approveBody.success).toBe(true);
    expect(approveBody.approval.status).toBe("APPROVED");
    expect(approveBody.approval.executedAt).toBeDefined();

    // 3. Verify physical inventory in DB was incremented: 10 + 25 = 35!
    const updatedInv = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    expect(updatedInv?.quantity).toBe(35);
  });

  it("prevents duplicate execution of already approved actions", async () => {
    const merchant = await registerMerchant(
      "Idempotent Store",
      `idem-${Date.now()}@example.com`
    );
    const token = merchant.token;

    const { variant } = await createProductWithVariant(
      token,
      "Daily Sneaker",
      `SKU-IDEM-${Date.now()}`,
      199900,
      5
    );

    const createRes = await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Restock Daily Sneaker",
          reason: "Restocking",
          quantity: 10,
          targetVariantId: variant.id,
          expectedImpact: "Keep stock",
          confidence: 0.9,
        },
      },
    });
    const approvalId = createRes.json().approval.id;

    // First approve: Success
    const firstRes = await app.inject({
      method: "POST",
      url: `/approvals/${approvalId}/approve`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(firstRes.statusCode).toBe(200);

    // Second approve: Rejected (Idempotency protection)
    const secondRes = await app.inject({
      method: "POST",
      url: `/approvals/${approvalId}/approve`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(secondRes.statusCode).toBe(400);
    expect(secondRes.json().error).toContain("already been executed");

    // Inventory must NOT be incremented twice: 5 + 10 = 15
    const inv = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    expect(inv?.quantity).toBe(15);
  });

  it("allows merchant to reject an approval without modifying inventory", async () => {
    const merchant = await registerMerchant(
      "Reject Store",
      `reject-${Date.now()}@example.com`
    );
    const token = merchant.token;

    const { variant } = await createProductWithVariant(
      token,
      "Declined Shoe",
      `SKU-DECL-${Date.now()}`,
      149900,
      8
    );

    const createRes = await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Restock Declined Shoe",
          reason: "Not needed right now",
          quantity: 15,
          targetVariantId: variant.id,
          expectedImpact: "Surplus",
          confidence: 0.88,
        },
      },
    });
    const approvalId = createRes.json().approval.id;

    // Merchant rejects the proposal
    const rejectRes = await app.inject({
      method: "POST",
      url: `/approvals/${approvalId}/reject`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(rejectRes.statusCode).toBe(200);
    expect(rejectRes.json().approval.status).toBe("REJECTED");

    // Cannot approve after rejection
    const approveAfterReject = await app.inject({
      method: "POST",
      url: `/approvals/${approvalId}/approve`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(approveAfterReject.statusCode).toBe(400);

    // Physical inventory remains untouched at 8
    const inv = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    expect(inv?.quantity).toBe(8);
  });

  it("enforces tenant isolation across approvals", async () => {
    const merchantA = await registerMerchant(
      "Merchant Alpha",
      `app-alpha-${Date.now()}@example.com`
    );
    const merchantB = await registerMerchant(
      "Merchant Beta",
      `app-beta-${Date.now()}@example.com`
    );

    const createResA = await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${merchantA.token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Alpha Exclusive Restock",
          reason: "Internal only",
          quantity: 10,
          expectedImpact: "Alpha only",
          confidence: 0.9,
        },
      },
    });
    const approvalAId = createResA.json().approval.id;

    // Merchant B attempts to approve Merchant A's approval
    const approveResB = await app.inject({
      method: "POST",
      url: `/approvals/${approvalAId}/approve`,
      headers: { authorization: `Bearer ${merchantB.token}` },
    });
    expect(approveResB.statusCode).toBe(404);

    // Merchant B attempts to reject Merchant A's approval
    const rejectResB = await app.inject({
      method: "POST",
      url: `/approvals/${approvalAId}/reject`,
      headers: { authorization: `Bearer ${merchantB.token}` },
    });
    expect(rejectResB.statusCode).toBe(404);

    // Merchant B lists approvals -> Should not see Merchant A's approval
    const listResB = await app.inject({
      method: "GET",
      url: "/approvals",
      headers: { authorization: `Bearer ${merchantB.token}` },
    });
    expect(listResB.statusCode).toBe(200);
    expect(listResB.json().approvals).toEqual([]);
  });
});
