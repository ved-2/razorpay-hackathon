import crypto from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { prisma } from "@commerceos/database";
import { env } from "../../config/env";

const app = buildApp();

async function setupTestMerchant() {
  const email = `webhook-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const registerRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      name: "Webhook Owner",
      email,
      password: "password123",
      merchantName: "Webhook Store",
    },
  });
  const { token, merchant } = registerRes.json();

  const productRes = await app.inject({
    method: "POST",
    url: "/products",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: "Webhook Product",
      description: "Test product for webhook tests",
    },
  });
  const { product } = productRes.json();

  return { token, merchant, product };
}

async function createVariant(
  token: string,
  productId: string,
  sku: string,
  price: number,
  quantity: number
) {
  const res = await app.inject({
    method: "POST",
    url: `/products/${productId}/variants`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: `Variant ${sku}`,
      sku,
      price,
      currency: "INR",
      quantity,
    },
  });
  return res.json().variant;
}

async function createOrder(
  token: string,
  items: Array<{ variantId: string; quantity: number }>
) {
  const res = await app.inject({
    method: "POST",
    url: "/orders",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      customer: {
        name: "Webhook Customer",
        email: "whcustomer@example.com",
      },
      items,
    },
  });
  return res.json().order;
}

function signWebhook(payload: string): string {
  return crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
}

describe("Razorpay Webhook Handler", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("handles payment.captured webhook and settles inventory", async () => {
    const { token, product } = await setupTestMerchant();
    const sku = `WH-CAP-${Date.now()}`;
    const variant = await createVariant(token, product.id, sku, 100000, 10);
    const order = await createOrder(token, [{ variantId: variant.id, quantity: 2 }]);

    const rzpOrderId = `order_wh_cap_${Date.now()}`;
    const rzpPaymentId = `pay_wh_cap_${Date.now()}`;

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

    const payloadObj = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: rzpPaymentId,
            order_id: rzpOrderId,
            amount: order.total,
            status: "captured",
          },
        },
      },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const signature = signWebhook(rawPayload);
    const eventId = `evt_cap_${Date.now()}`;

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
      payload: rawPayload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().received).toBe(true);

    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.status).toBe("PAID");

    const dbPayment = await prisma.payment.findFirst({
      where: { orderId: order.id, providerOrderId: rzpOrderId },
    });
    expect(dbPayment?.status).toBe("VERIFIED");
    expect(dbPayment?.providerPaymentId).toBe(rzpPaymentId);

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    // 10 - 2 = 8, reserved = 0
    expect(inventory?.quantity).toBe(8);
    expect(inventory?.reserved).toBe(0);
  });

  it("handles payment.failed webhook and releases reserved inventory", async () => {
    const { token, product } = await setupTestMerchant();
    const sku = `WH-FAIL-${Date.now()}`;
    const variant = await createVariant(token, product.id, sku, 100000, 10);
    const order = await createOrder(token, [{ variantId: variant.id, quantity: 3 }]);

    const rzpOrderId = `order_wh_fail_${Date.now()}`;
    const rzpPaymentId = `pay_wh_fail_${Date.now()}`;

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

    const payloadObj = {
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: rzpPaymentId,
            order_id: rzpOrderId,
            amount: order.total,
            status: "failed",
          },
        },
      },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const signature = signWebhook(rawPayload);
    const eventId = `evt_fail_${Date.now()}`;

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
      payload: rawPayload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().received).toBe(true);

    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.status).toBe("CANCELLED");

    const dbPayment = await prisma.payment.findFirst({
      where: { orderId: order.id, providerOrderId: rzpOrderId },
    });
    expect(dbPayment?.status).toBe("FAILED");

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    // Physical stock remains 10, reservation released back to 0
    expect(inventory?.quantity).toBe(10);
    expect(inventory?.reserved).toBe(0);
  });

  it("rejects webhook with invalid signature", async () => {
    const rawPayload = JSON.stringify({ event: "payment.captured" });
    const invalidSignature = "invalid_signature_hex_1234567890abcdef";
    const eventId = `evt_bad_sig_${Date.now()}`;

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": invalidSignature,
        "x-razorpay-event-id": eventId,
      },
      payload: rawPayload,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Invalid webhook signature");
  });

  it("detects and safely ignores duplicate webhook events", async () => {
    const { token, product } = await setupTestMerchant();
    const sku = `WH-DUP-${Date.now()}`;
    const variant = await createVariant(token, product.id, sku, 100000, 10);
    const order = await createOrder(token, [{ variantId: variant.id, quantity: 2 }]);

    const rzpOrderId = `order_wh_dup_${Date.now()}`;
    const rzpPaymentId = `pay_wh_dup_${Date.now()}`;

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

    const payloadObj = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: rzpPaymentId,
            order_id: rzpOrderId,
            amount: order.total,
            status: "captured",
          },
        },
      },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const signature = signWebhook(rawPayload);
    const eventId = `evt_dup_${Date.now()}`;

    // First arrival
    const firstRes = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
      payload: rawPayload,
    });
    expect(firstRes.statusCode).toBe(200);

    const invAfterFirst = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    expect(invAfterFirst?.quantity).toBe(8);

    // Second arrival with same eventId
    const secondRes = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
      payload: rawPayload,
    });
    expect(secondRes.statusCode).toBe(200);
    expect(secondRes.json().duplicate).toBe(true);

    const invAfterSecond = await prisma.inventory.findUnique({
      where: { variantId: variant.id },
    });
    // Stock must not be deducted again
    expect(invAfterSecond?.quantity).toBe(8);
  });

  it("handles unknown/unhandled events gracefully", async () => {
    const rawPayload = JSON.stringify({
      event: "order.paid",
      payload: {},
    });
    const signature = signWebhook(rawPayload);
    const eventId = `evt_unknown_${Date.now()}`;

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
      payload: rawPayload,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().received).toBe(true);
  });

  it("returns 404 when payment record does not exist", async () => {
    const rawPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_unknown_123",
            order_id: "order_non_existent_456",
            amount: 1000,
          },
        },
      },
    });
    const signature = signWebhook(rawPayload);
    const eventId = `evt_missing_payment_${Date.now()}`;

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
      payload: rawPayload,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("Payment not found");
  });

  it("rejects malformed payload with 400", async () => {
    const malformedRaw = '{"event": "payment.captured", "broken": ';
    const signature = signWebhook(malformedRaw);
    const eventId = `evt_malformed_${Date.now()}`;

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/razorpay",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": eventId,
      },
      payload: malformedRaw,
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error === "Bad Request" || body.error === "Invalid webhook payload").toBe(true);
  });
});
