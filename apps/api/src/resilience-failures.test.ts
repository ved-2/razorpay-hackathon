import crypto from "node:crypto";
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";
import { prisma } from "@commerceos/database";
import { env } from "./config/env";
import { paymentProvider } from "./lib/razorpay";

const app = buildApp();

function generateSignature(orderId: string, paymentId: string): string {
  return crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

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

describe("CommerceOS System Resilience & Failure Testing", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Transactional Rollback & Compensation", () => {
    it("rolls back inventory reservation and cancels order when payment gateway fails", async () => {
      // Mock payment gateway failure (e.g. external network timeout)
      vi.spyOn(paymentProvider, "createOrder").mockRejectedValue(
        new Error("Razorpay Gateway 504 Gateway Timeout")
      );

      const merchant = await registerMerchant(
        "Rollback Merchant",
        `rollback-${Date.now()}@example.com`
      );

      const { variant } = await createProductWithVariant(
        merchant.token,
        "Resilient Sneaker",
        `SKU-ROLL-${Date.now()}`,
        200000,
        10
      );

      const checkoutRes = await app.inject({
        method: "POST",
        url: "/buyer/checkout",
        payload: {
          variantId: variant.id,
          quantity: 4,
          customer: {
            name: "Agent Tester",
            email: "agent@tester.ai",
          },
        },
      });

      // Checkout must fail with 500 error
      expect(checkoutRes.statusCode).toBe(500);
      expect(checkoutRes.json().error).toContain("Payment gateway failure");

      // Verify DB state: reservation must be 0, quantity remains 10
      const inventory = await prisma.inventory.findUnique({
        where: { variantId: variant.id },
      });
      expect(inventory?.quantity).toBe(10);
      expect(inventory?.reserved).toBe(0);

      // Verify the order was cancelled, not left in PENDING_PAYMENT
      const cancelledOrders = await prisma.order.findMany({
        where: {
          merchantId: merchant.merchant.id,
          status: "CANCELLED",
        },
      });
      expect(cancelledOrders.length).toBe(1);
    });
  });

  describe("2. Concurrent Race Condition & Oversell Protection", () => {
    it("prevents stock from going negative when multiple checkouts compete for limited inventory", async () => {
      vi.spyOn(paymentProvider, "createOrder").mockResolvedValue({
        id: `order_concurrent_${Date.now()}`,
        amount: 200000,
        currency: "INR",
        status: "created",
        receipt: "rcpt_concur",
        raw: {},
      });

      const merchant = await registerMerchant(
        "Limited Stock Merchant",
        `limited-${Date.now()}@example.com`
      );

      // Only 2 units available
      const { variant } = await createProductWithVariant(
        merchant.token,
        "Limited Edition Hoodie",
        `SKU-LIMIT-${Date.now()}`,
        100000,
        2
      );

      // Checkout 1: Requests 2 units -> Should SUCCEED
      const res1 = await app.inject({
        method: "POST",
        url: "/buyer/checkout",
        payload: {
          variantId: variant.id,
          quantity: 2,
          customer: {
            name: "First Buyer",
            email: "first@example.com",
          },
        },
      });
      expect(res1.statusCode).toBe(201);

      // Checkout 2: Requests 1 unit -> Must FAIL due to insufficient stock
      const res2 = await app.inject({
        method: "POST",
        url: "/buyer/checkout",
        payload: {
          variantId: variant.id,
          quantity: 1,
          customer: {
            name: "Second Buyer",
            email: "second@example.com",
          },
        },
      });
      expect(res2.statusCode).toBe(400);
      expect(res2.json().error).toContain("Insufficient inventory");

      // Verify DB consistency
      const inventory = await prisma.inventory.findUnique({
        where: { variantId: variant.id },
      });
      expect(inventory?.quantity).toBe(2);
      expect(inventory?.reserved).toBe(2);
    });
  });

  describe("3. Tampered Payment Signature Detection", () => {
    it("rejects forged Razorpay signature and marks payment as FAILED without touching inventory", async () => {
      const merchant = await registerMerchant(
        "Security Merchant",
        `sec-${Date.now()}@example.com`
      );

      const { variant } = await createProductWithVariant(
        merchant.token,
        "Security Gear",
        `SKU-SEC-${Date.now()}`,
        300000,
        10
      );

      // Create order
      const orderRes = await app.inject({
        method: "POST",
        url: "/orders",
        headers: { authorization: `Bearer ${merchant.token}` },
        payload: {
          customer: { name: "Victim Customer", email: "victim@example.com" },
          items: [{ variantId: variant.id, quantity: 2 }],
        },
      });
      const order = orderRes.json().order;

      const fakeRzpOrderId = `order_fake_${Date.now()}`;
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "razorpay",
          providerOrderId: fakeRzpOrderId,
          amount: order.total,
          currency: "INR",
          status: "CREATED",
        },
      });

      // Submit verification with a tampered signature
      const tamperedSignature = "bad_forged_signature_hash_000000000000000000000";
      const verifyRes = await app.inject({
        method: "POST",
        url: `/orders/${order.id}/payment/verify`,
        headers: { authorization: `Bearer ${merchant.token}` },
        payload: {
          razorpayOrderId: fakeRzpOrderId,
          razorpayPaymentId: "pay_tampered_123",
          razorpaySignature: tamperedSignature,
        },
      });

      expect(verifyRes.statusCode).toBe(400);
      expect(verifyRes.json().error).toContain("Invalid payment signature");

      // Verify order is still PENDING_PAYMENT
      const dbOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(dbOrder?.status).toBe("PENDING_PAYMENT");

      // Verify inventory was NOT settled
      const inventory = await prisma.inventory.findUnique({
        where: { variantId: variant.id },
      });
      expect(inventory?.quantity).toBe(10); // Not decremented
      expect(inventory?.reserved).toBe(2); // Still reserved
    });
  });

  describe("4. Replay Attack & Duplicate Payment Idempotency", () => {
    it("prevents double-settlement on replayed payment verification requests", async () => {
      const merchant = await registerMerchant(
        "Idempotency Merchant",
        `idemp-${Date.now()}@example.com`
      );

      const { variant } = await createProductWithVariant(
        merchant.token,
        "Idempotent Asset",
        `SKU-IDEM-${Date.now()}`,
        50000,
        10
      );

      const orderRes = await app.inject({
        method: "POST",
        url: "/orders",
        headers: { authorization: `Bearer ${merchant.token}` },
        payload: {
          customer: { name: "Safe Buyer", email: "safe@example.com" },
          items: [{ variantId: variant.id, quantity: 3 }],
        },
      });
      const order = orderRes.json().order;

      const rzpOrderId = `order_replay_${Date.now()}`;
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "razorpay",
          providerOrderId: rzpOrderId,
          amount: order.total,
          currency: "INR",
          status: "CREATED",
        },
      });

      const rzpPaymentId = `pay_replay_${Date.now()}`;
      const validSignature = generateSignature(rzpOrderId, rzpPaymentId);

      // First verification: Success
      const firstRes = await app.inject({
        method: "POST",
        url: `/orders/${order.id}/payment/verify`,
        headers: { authorization: `Bearer ${merchant.token}` },
        payload: {
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          razorpaySignature: validSignature,
        },
      });
      expect(firstRes.statusCode).toBe(200);

      // Verify stock settled: 10 - 3 = 7, reserved: 0
      const postFirstInv = await prisma.inventory.findUnique({
        where: { variantId: variant.id },
      });
      expect(postFirstInv?.quantity).toBe(7);
      expect(postFirstInv?.reserved).toBe(0);

      // Second verification (Replay Attack / duplicate webhook):
      const secondRes = await app.inject({
        method: "POST",
        url: `/orders/${order.id}/payment/verify`,
        headers: { authorization: `Bearer ${merchant.token}` },
        payload: {
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          razorpaySignature: validSignature,
        },
      });
      expect(secondRes.statusCode).toBe(200);

      // Inventory must NOT be decremented a second time (must remain 7)
      const postSecondInv = await prisma.inventory.findUnique({
        where: { variantId: variant.id },
      });
      expect(postSecondInv?.quantity).toBe(7);
      expect(postSecondInv?.reserved).toBe(0);
    });
  });

  describe("5. Multi-Tenant Isolation & Cross-Tenant Attack Guards", () => {
    it("completely isolates orders, approvals, and audit trails between merchants", async () => {
      const merchantA = await registerMerchant(
        "Tenant Alpha",
        `alpha-${Date.now()}@example.com`
      );
      const merchantB = await registerMerchant(
        "Tenant Beta",
        `beta-${Date.now()}@example.com`
      );

      const { variant: variantA } = await createProductWithVariant(
        merchantA.token,
        "Alpha Secret Item",
        `SKU-ALPHA-${Date.now()}`,
        100000,
        5
      );

      // Merchant A creates an order
      const orderResA = await app.inject({
        method: "POST",
        url: "/orders",
        headers: { authorization: `Bearer ${merchantA.token}` },
        payload: {
          customer: { name: "Alpha Customer", email: "alpha-cust@example.com" },
          items: [{ variantId: variantA.id, quantity: 1 }],
        },
      });
      const orderA = orderResA.json().order;

      // Merchant B tries to cancel Merchant A's order -> 404
      const cancelAttempt = await app.inject({
        method: "POST",
        url: `/orders/${orderA.id}/cancel`,
        headers: { authorization: `Bearer ${merchantB.token}` },
      });
      expect(cancelAttempt.statusCode).toBe(404);

      // Merchant B tries to verify payment on Merchant A's order -> 404
      const verifyAttempt = await app.inject({
        method: "POST",
        url: `/orders/${orderA.id}/payment/verify`,
        headers: { authorization: `Bearer ${merchantB.token}` },
        payload: {
          razorpayOrderId: "order_b_hack",
          razorpayPaymentId: "pay_b_hack",
          razorpaySignature: "sig_b_hack",
        },
      });
      expect(verifyAttempt.statusCode).toBe(404);

      // Merchant A creates an approval
      const approvalResA = await app.inject({
        method: "POST",
        url: "/approvals",
        headers: { authorization: `Bearer ${merchantA.token}` },
        payload: {
          proposal: {
            action: "RESTOCK",
            title: "Alpha Restock",
            reason: "Demand high",
            quantity: 10,
            targetVariantId: variantA.id,
            expectedImpact: "High",
            confidence: 0.9,
          },
        },
      });
      const approvalA = approvalResA.json().approval;

      // Merchant B tries to approve Merchant A's approval -> 404
      const approveAttempt = await app.inject({
        method: "POST",
        url: `/approvals/${approvalA.id}/approve`,
        headers: { authorization: `Bearer ${merchantB.token}` },
      });
      expect(approveAttempt.statusCode).toBe(404);

      // Merchant B checks audit trail -> Merchant A's activities are not visible
      const auditB = await app.inject({
        method: "GET",
        url: "/audit",
        headers: { authorization: `Bearer ${merchantB.token}` },
      });
      const eventsB = auditB.json().events;
      const alphaEntityIds = eventsB.map((e: any) => e.entityId);
      expect(alphaEntityIds).not.toContain(orderA.id);
      expect(alphaEntityIds).not.toContain(approvalA.id);
    });
  });

  describe("6. Malformed & Boundary Input Guardrails", () => {
    it("rejects invalid payloads with clear 400 Bad Request responses", async () => {
      // 1. Negative quantity in checkout
      const resNeg = await app.inject({
        method: "POST",
        url: "/buyer/checkout",
        payload: {
          variantId: "valid_id",
          quantity: -5,
          customer: { name: "Agent", email: "agent@test.ai" },
        },
      });
      expect(resNeg.statusCode).toBe(400);

      // 2. Invalid customer email format
      const resEmail = await app.inject({
        method: "POST",
        url: "/buyer/checkout",
        payload: {
          variantId: "valid_id",
          quantity: 1,
          customer: { name: "Agent", email: "not-an-email" },
        },
      });
      expect(resEmail.statusCode).toBe(400);

      // 3. Zero or negative budget
      const resPrice = await app.inject({
        method: "POST",
        url: "/buyer/evaluate",
        payload: {
          product: { name: "Shoe", price: -100, currency: "INR" },
          policy: { maxPrice: 1000, currency: "INR" },
        },
      });
      expect(resPrice.statusCode).toBe(400);
    });
  });
});
