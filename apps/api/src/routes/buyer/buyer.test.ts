import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app";
import { prisma } from "@commerceos/database";
import { paymentProvider } from "../../lib/razorpay";

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
      name: `${productName} Standard`,
      sku,
      price,
      currency: "INR",
      quantity: stock,
    },
  });
  const variant = vRes.json().variant;

  return { product, variant };
}

describe("AI Buyer Route Suite", () => {
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

  describe("POST /buyer/evaluate", () => {
    it("approves purchase decision (BUY) when product satisfies policy criteria", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/buyer/evaluate",
        payload: {
          product: {
            name: "Cloudfoam Running Shoes",
            price: 249900,
            currency: "INR",
            description: "High performance breathable running shoes",
          },
          policy: {
            maxPrice: 300000,
            currency: "INR",
            requiredKeywords: ["running"],
            blockedKeywords: ["cheap"],
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.evaluation.decision).toBe("BUY");
      expect(body.evaluation.policyPassed).toBe(true);
      expect(body.evaluation.confidence).toBeGreaterThanOrEqual(0.8);
      expect(body.evaluation.reason).toContain("within the budget limit");
    });

    it("rejects purchase decision (SKIP) when product price exceeds maxPrice", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/buyer/evaluate",
        payload: {
          product: {
            name: "Luxury Carbon Plated Racer",
            price: 1999900,
            currency: "INR",
          },
          policy: {
            maxPrice: 500000,
            currency: "INR",
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.evaluation.decision).toBe("SKIP");
      expect(body.evaluation.policyPassed).toBe(false);
      expect(body.evaluation.confidence).toBe(0.95);
      expect(body.evaluation.reason).toContain("exceeds maximum buyer budget");
      expect(body.evaluation.policyViolations[0]).toContain("exceeds maximum buyer budget");
    });

    it("rejects purchase decision (SKIP) when product matches blocked keywords", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/buyer/evaluate",
        payload: {
          product: {
            name: "Cheap Knockoff Sneaker",
            price: 49900,
            currency: "INR",
          },
          policy: {
            maxPrice: 100000,
            currency: "INR",
            blockedKeywords: ["cheap", "knockoff"],
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.evaluation.decision).toBe("SKIP");
      expect(body.evaluation.policyPassed).toBe(false);
      expect(body.evaluation.policyViolations[0]).toContain("contains blocked keyword");
    });

    it("rejects purchase decision (SKIP) when required keywords are missing", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/buyer/evaluate",
        payload: {
          product: {
            name: "Casual Canvas Slip-on",
            price: 129900,
            currency: "INR",
            description: "Everyday relaxed footwear",
          },
          policy: {
            maxPrice: 200000,
            currency: "INR",
            requiredKeywords: ["waterproof", "trail"],
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.evaluation.decision).toBe("SKIP");
      expect(body.evaluation.policyPassed).toBe(false);
      expect(body.evaluation.policyViolations[0]).toContain("does not match any required buyer keywords");
    });

    it("returns validation error on malformed evaluation payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/buyer/evaluate",
        payload: {
          product: {
            name: "",
            price: -100,
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("Invalid buyer evaluation request");
    });
  });

  describe("POST /buyer/checkout", () => {
    it("successfully completes checkout, reserves inventory, creates order and payment", async () => {
      vi.spyOn(paymentProvider, "createOrder").mockImplementation(async (input) => ({
        id: `order_mock_buyer_${Date.now()}`,
        amount: input.amount,
        currency: input.currency,
        status: "created",
        receipt: input.receipt,
        raw: {},
      }));

      const merchant = await registerMerchant(
        "Autonomous Merchant",
        `auto-merchant-${Date.now()}@example.com`
      );

      const { variant } = await createProductWithVariant(
        merchant.token,
        "Autonomous Pro Runner",
        `SKU-AUTO-${Date.now()}`,
        299900,
        15
      );

      const res = await app.inject({
        method: "POST",
        url: "/buyer/checkout",
        payload: {
          variantId: variant.id,
          quantity: 2,
          customer: {
            name: "Autonomous AI Buyer Agent",
            email: `ai-buyer-${Date.now()}@agent.ai`,
            phone: "+919876543210",
          },
          policy: {
            maxPrice: 600000,
            currency: "INR",
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.order.id).toBeDefined();
      expect(body.order.total).toBe(599800); // 299900 * 2
      expect(body.order.status).toBe("PENDING_PAYMENT");
      expect(body.payment.providerOrderId).toContain("order_mock_buyer_");
      expect(body.payment.amount).toBe(599800);

      // Verify physical inventory reservation in DB
      const inventory = await prisma.inventory.findUnique({
        where: { variantId: variant.id },
      });
      expect(inventory?.quantity).toBe(15);
      expect(inventory?.reserved).toBe(2);

      // Verify audit log record
      const auditLogs = await prisma.auditEvent.findMany({
        where: {
          entityId: body.order.id,
          action: "ORDER_CREATED",
        },
      });
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].actorType).toBe("AI_AGENT");
    });

    it("rejects checkout when product total exceeds buyer maximum budget", async () => {
      const merchant = await registerMerchant(
        "Budget Merchant",
        `budget-merchant-${Date.now()}@example.com`
      );

      const { variant } = await createProductWithVariant(
        merchant.token,
        "Premium Track Spike",
        `SKU-BUDGET-${Date.now()}`,
        500000,
        10
      );

      const res = await app.inject({
        method: "POST",
        url: "/buyer/checkout",
        payload: {
          variantId: variant.id,
          quantity: 2, // 2 * 500000 = 1,000,000
          customer: {
            name: "Agent Over Budget",
            email: `budget-agent-${Date.now()}@agent.ai`,
          },
          policy: {
            maxPrice: 600000, // max is 600,000
            currency: "INR",
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("exceeds buyer maximum budget");
    });

    it("rejects checkout when variant has insufficient stock", async () => {
      const merchant = await registerMerchant(
        "Stock Depleted Merchant",
        `depleted-${Date.now()}@example.com`
      );

      const { variant } = await createProductWithVariant(
        merchant.token,
        "Low Stock Sneaker",
        `SKU-LOW-${Date.now()}`,
        150000,
        1 // Only 1 in stock
      );

      const res = await app.inject({
        method: "POST",
        url: "/buyer/checkout",
        payload: {
          variantId: variant.id,
          quantity: 3, // Requesting 3
          customer: {
            name: "Greedy Agent",
            email: `greedy-${Date.now()}@agent.ai`,
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("Insufficient inventory");
    });

    it("returns 404 when target variant does not exist", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/buyer/checkout",
        payload: {
          variantId: "non-existent-variant-id",
          quantity: 1,
          customer: {
            name: "Lost Agent",
            email: "lost@agent.ai",
          },
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("Product variant not found");
    });
  });
});
