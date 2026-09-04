import crypto from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";
import { prisma } from "@commerceos/database";
import { env } from "./config/env";
import { paymentProvider } from "./lib/razorpay";

const app = buildApp();

function generateRazorpaySignature(orderId: string, paymentId: string): string {
  return crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

describe("End-to-End Autonomous Commerce Loop", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("orchestrates complete autonomous loop: Opportunity -> AI Proposal -> Policy -> Approval -> Execution -> AI Buyer -> Checkout -> Payment Settlement -> Audit Trail", async () => {
    // -------------------------------------------------------------------------
    // Phase 1: Store & Catalog Initialization
    // -------------------------------------------------------------------------
    const merchantEmail = `e2e-loop-${Date.now()}@example.com`;
    const regRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Autonomous merchant",
        email: merchantEmail,
        password: "password123",
        merchantName: "Apex Athletics",
      },
    });
    expect(regRes.statusCode).toBe(201);
    const { token, merchant } = regRes.json();

    // Create a product
    const productRes = await app.inject({
      method: "POST",
      url: "/products",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Pro Marathon Runner",
        description: "Elite lightweight carbon-plated marathon running shoes",
      },
    });
    expect(productRes.statusCode).toBe(201);
    const product = productRes.json().product;

    // Create a variant with initial stock = 3
    const initialStock = 3;
    const variantPrice = 249900; // ₹2,499.00
    const variantRes = await app.inject({
      method: "POST",
      url: `/products/${product.id}/variants`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Carbon Black Size 10",
        sku: `SKU-E2E-${Date.now()}`,
        price: variantPrice,
        currency: "INR",
        quantity: initialStock,
      },
    });
    expect(variantRes.statusCode).toBe(201);
    const variant = variantRes.json().variant;

    // Simulate an initial paid order to demonstrate real sales velocity
    const seedOrderRes = await app.inject({
      method: "POST",
      url: "/orders",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customer: { name: "Early Bird", email: "early@example.com" },
        items: [{ variantId: variant.id, quantity: 1 }],
      },
    });
    expect(seedOrderRes.statusCode).toBe(201);
    const seedOrder = seedOrderRes.json().order;

    // Settle the initial seed order: 3 - 1 = 2 remaining available stock, 0 reserved
    await prisma.$transaction([
      prisma.order.update({
        where: { id: seedOrder.id },
        data: { status: "PAID" },
      }),
      prisma.inventory.update({
        where: { variantId: variant.id },
        data: {
          quantity: { decrement: 1 },
          reserved: { decrement: 1 },
        },
      }),
    ]);

    // -------------------------------------------------------------------------
    // Phase 2: Revenue Intelligence / Opportunity Detection
    // -------------------------------------------------------------------------
    const oppRes = await app.inject({
      method: "GET",
      url: "/revenue/opportunities",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(oppRes.statusCode).toBe(200);
    const { opportunities } = oppRes.json();

    const lowStockOpp = opportunities.find(
      (opp: any) =>
        opp.type === "LOW_STOCK" && opp.data?.variantId === variant.id
    );
    expect(lowStockOpp).toBeDefined();
    expect(lowStockOpp.priority).toBe("HIGH"); // availableStock <= 2 is HIGH priority
    const recommendedRestock = lowStockOpp.data.recommendedRestock;
    expect(recommendedRestock).toBeGreaterThanOrEqual(10);

    // -------------------------------------------------------------------------
    // Phase 3: AI Opportunity Reasoning Pipeline
    // -------------------------------------------------------------------------
    const proposeRes = await app.inject({
      method: "POST",
      url: `/ai/opportunities/${lowStockOpp.id}/propose`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(proposeRes.statusCode).toBe(200);
    const { proposal } = proposeRes.json();
    expect(proposal.action).toBe("RESTOCK");
    expect(proposal.quantity).toBe(recommendedRestock);
    expect(proposal.confidence).toBeGreaterThanOrEqual(0.9);
    expect(proposal.targetVariantId).toBe(variant.id);

    // -------------------------------------------------------------------------
    // Phase 4: Policy Engine Pre-Evaluation
    // -------------------------------------------------------------------------
    const policyRes = await app.inject({
      method: "POST",
      url: "/policy/evaluate",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        proposal,
        policy: {
          maxRestockQuantity: 50,
          minConfidence: 0.8,
        },
      },
    });
    expect(policyRes.statusCode).toBe(200);
    const policyResult = policyRes.json().evaluation;
    expect(policyResult.allowed).toBe(true);
    expect(policyResult.violations).toEqual([]);

    // -------------------------------------------------------------------------
    // Phase 5: Merchant Approval & Action Execution
    // -------------------------------------------------------------------------
    const createApprovalRes = await app.inject({
      method: "POST",
      url: "/approvals",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        proposal,
        opportunityId: lowStockOpp.id,
      },
    });
    expect(createApprovalRes.statusCode).toBe(201);
    const approval = createApprovalRes.json().approval;
    expect(approval.status).toBe("PENDING");
    expect(approval.type).toBe("RESTOCK");

    // Merchant inspects and approves the proposal
    const approveRes = await app.inject({
      method: "POST",
      url: `/approvals/${approval.id}/approve`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(approveRes.statusCode).toBe(200);
    const approvedBody = approveRes.json();
    expect(approvedBody.success).toBe(true);
    expect(approvedBody.approval.status).toBe("APPROVED");

    // Verify physical inventory increment in the database
    const postRestockInventory = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    const expectedQuantity = initialStock - 1 + recommendedRestock;
    expect(postRestockInventory?.quantity).toBe(expectedQuantity);

    // -------------------------------------------------------------------------
    // Phase 6: AI Buyer Evaluation
    // -------------------------------------------------------------------------
    const buyerEvalRes = await app.inject({
      method: "POST",
      url: "/buyer/evaluate",
      payload: {
        product: {
          name: product.name,
          price: variant.price,
          currency: "INR",
          description: product.description,
          merchantId: merchant.id,
          variantId: variant.id,
        },
        policy: {
          maxPrice: 300000,
          currency: "INR",
          requiredKeywords: ["marathon", "runner"],
          blockedKeywords: ["knockoff", "cheap"],
        },
      },
    });
    expect(buyerEvalRes.statusCode).toBe(200);
    const evalData = buyerEvalRes.json().evaluation;
    expect(evalData.decision).toBe("BUY");
    expect(evalData.policyPassed).toBe(true);
    expect(evalData.confidence).toBeGreaterThanOrEqual(0.9);

    // -------------------------------------------------------------------------
    // Phase 7: Autonomous Checkout Orchestration
    // -------------------------------------------------------------------------
    const mockRzpOrderId = `order_rzp_e2e_${Date.now()}`;
    vi.spyOn(paymentProvider, "createOrder").mockResolvedValue({
      id: mockRzpOrderId,
      amount: variantPrice * 2,
      currency: "INR",
      status: "created",
      receipt: "rcpt_e2e_1",
      raw: {},
    });

    const checkoutUnits = 2;
    const checkoutRes = await app.inject({
      method: "POST",
      url: "/buyer/checkout",
      payload: {
        variantId: variant.id,
        quantity: checkoutUnits,
        customer: {
          name: "Autonomous Agent Alpha",
          email: "agent-alpha@procurement.ai",
          phone: "+919999988888",
        },
        policy: {
          maxPrice: 600000,
          currency: "INR",
        },
      },
    });
    expect(checkoutRes.statusCode).toBe(201);
    const checkoutBody = checkoutRes.json();
    expect(checkoutBody.success).toBe(true);
    const autonomousOrder = checkoutBody.order;
    const autonomousPayment = checkoutBody.payment;

    expect(autonomousOrder.status).toBe("PENDING_PAYMENT");
    expect(autonomousOrder.total).toBe(variantPrice * checkoutUnits);
    expect(autonomousPayment.providerOrderId).toBe(mockRzpOrderId);

    // Verify stock reservation (reserved increases by checkoutUnits, quantity unchanged yet)
    const reservedInventory = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    expect(reservedInventory?.quantity).toBe(expectedQuantity);
    expect(reservedInventory?.reserved).toBe(checkoutUnits);

    // -------------------------------------------------------------------------
    // Phase 8: Razorpay Payment Verification & Inventory Settlement
    // -------------------------------------------------------------------------
    const mockRzpPaymentId = `pay_rzp_e2e_${Date.now()}`;
    const validSignature = generateRazorpaySignature(
      mockRzpOrderId,
      mockRzpPaymentId
    );

    const verifyRes = await app.inject({
      method: "POST",
      url: `/orders/${autonomousOrder.id}/payment/verify`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        razorpayOrderId: mockRzpOrderId,
        razorpayPaymentId: mockRzpPaymentId,
        razorpaySignature: validSignature,
      },
    });
    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = verifyRes.json();
    expect(verifyBody.order).toBeDefined();
    expect(verifyBody.order.status).toBe("PAID");
    expect(verifyBody.payment.status).toBe("VERIFIED");

    // Verify atomic inventory settlement:
    // quantity decreases by checkoutUnits, reserved decreases by checkoutUnits
    const settledInventory = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    expect(settledInventory?.quantity).toBe(expectedQuantity - checkoutUnits);
    expect(settledInventory?.reserved).toBe(0);

    // -------------------------------------------------------------------------
    // Phase 9: Audit Trail Unbroken Chain Verification
    // -------------------------------------------------------------------------
    const auditRes = await app.inject({
      method: "GET",
      url: "/audit",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(auditRes.statusCode).toBe(200);
    const auditEvents = auditRes.json().events;

    const actionTypes = auditEvents.map((e: any) => e.action);

    // Verify every crucial milestone of the autonomous loop is present in the audit trail:
    expect(actionTypes).toContain("POLICY_CHECKED");
    expect(actionTypes).toContain("APPROVAL_CREATED");
    expect(actionTypes).toContain("APPROVAL_APPROVED");
    expect(actionTypes).toContain("ACTION_EXECUTED");
    expect(actionTypes).toContain("ORDER_CREATED");
    expect(actionTypes).toContain("PAYMENT_VERIFIED");

    // Verify that AI Agent was properly recognized as an autonomous actor
    const agentEvents = auditEvents.filter((e: any) => e.actorType === "AI_AGENT");
    expect(agentEvents.length).toBeGreaterThanOrEqual(1);
    expect(agentEvents.some((e: any) => e.action === "ORDER_CREATED")).toBe(true);
  });
});
