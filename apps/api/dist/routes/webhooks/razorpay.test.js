"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const vitest_1 = require("vitest");
const app_1 = require("../../app");
const database_1 = require("@commerceos/database");
const env_1 = require("../../config/env");
const app = (0, app_1.buildApp)();
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
async function createVariant(token, productId, sku, price, quantity) {
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
async function createOrder(token, items) {
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
function signWebhook(payload) {
    return node_crypto_1.default
        .createHmac("sha256", env_1.env.RAZORPAY_WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");
}
(0, vitest_1.describe)("Razorpay Webhook Handler", () => {
    (0, vitest_1.beforeAll)(async () => {
        await app.ready();
    });
    (0, vitest_1.afterAll)(async () => {
        await app.close();
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("handles payment.captured webhook and settles inventory", async () => {
        const { token, product } = await setupTestMerchant();
        const sku = `WH-CAP-${Date.now()}`;
        const variant = await createVariant(token, product.id, sku, 100000, 10);
        const order = await createOrder(token, [{ variantId: variant.id, quantity: 2 }]);
        const rzpOrderId = `order_wh_cap_${Date.now()}`;
        const rzpPaymentId = `pay_wh_cap_${Date.now()}`;
        await database_1.prisma.payment.create({
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
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().received).toBe(true);
        const dbOrder = await database_1.prisma.order.findUnique({ where: { id: order.id } });
        (0, vitest_1.expect)(dbOrder?.status).toBe("PAID");
        const dbPayment = await database_1.prisma.payment.findFirst({
            where: { orderId: order.id, providerOrderId: rzpOrderId },
        });
        (0, vitest_1.expect)(dbPayment?.status).toBe("VERIFIED");
        (0, vitest_1.expect)(dbPayment?.providerPaymentId).toBe(rzpPaymentId);
        const inventory = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant.id },
        });
        // 10 - 2 = 8, reserved = 0
        (0, vitest_1.expect)(inventory?.quantity).toBe(8);
        (0, vitest_1.expect)(inventory?.reserved).toBe(0);
    });
    (0, vitest_1.it)("handles payment.failed webhook and releases reserved inventory", async () => {
        const { token, product } = await setupTestMerchant();
        const sku = `WH-FAIL-${Date.now()}`;
        const variant = await createVariant(token, product.id, sku, 100000, 10);
        const order = await createOrder(token, [{ variantId: variant.id, quantity: 3 }]);
        const rzpOrderId = `order_wh_fail_${Date.now()}`;
        const rzpPaymentId = `pay_wh_fail_${Date.now()}`;
        await database_1.prisma.payment.create({
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
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().received).toBe(true);
        const dbOrder = await database_1.prisma.order.findUnique({ where: { id: order.id } });
        (0, vitest_1.expect)(dbOrder?.status).toBe("CANCELLED");
        const dbPayment = await database_1.prisma.payment.findFirst({
            where: { orderId: order.id, providerOrderId: rzpOrderId },
        });
        (0, vitest_1.expect)(dbPayment?.status).toBe("FAILED");
        const inventory = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant.id },
        });
        // Physical stock remains 10, reservation released back to 0
        (0, vitest_1.expect)(inventory?.quantity).toBe(10);
        (0, vitest_1.expect)(inventory?.reserved).toBe(0);
    });
    (0, vitest_1.it)("rejects webhook with invalid signature", async () => {
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
        (0, vitest_1.expect)(res.statusCode).toBe(400);
        (0, vitest_1.expect)(res.json().error).toBe("Invalid webhook signature");
    });
    (0, vitest_1.it)("detects and safely ignores duplicate webhook events", async () => {
        const { token, product } = await setupTestMerchant();
        const sku = `WH-DUP-${Date.now()}`;
        const variant = await createVariant(token, product.id, sku, 100000, 10);
        const order = await createOrder(token, [{ variantId: variant.id, quantity: 2 }]);
        const rzpOrderId = `order_wh_dup_${Date.now()}`;
        const rzpPaymentId = `pay_wh_dup_${Date.now()}`;
        await database_1.prisma.payment.create({
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
        (0, vitest_1.expect)(firstRes.statusCode).toBe(200);
        const invAfterFirst = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant.id },
        });
        (0, vitest_1.expect)(invAfterFirst?.quantity).toBe(8);
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
        (0, vitest_1.expect)(secondRes.statusCode).toBe(200);
        (0, vitest_1.expect)(secondRes.json().duplicate).toBe(true);
        const invAfterSecond = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant.id },
        });
        // Stock must not be deducted again
        (0, vitest_1.expect)(invAfterSecond?.quantity).toBe(8);
    });
    (0, vitest_1.it)("handles unknown/unhandled events gracefully", async () => {
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
        (0, vitest_1.expect)(res.statusCode).toBe(200);
        (0, vitest_1.expect)(res.json().received).toBe(true);
    });
    (0, vitest_1.it)("returns 404 when payment record does not exist", async () => {
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
        (0, vitest_1.expect)(res.statusCode).toBe(404);
        (0, vitest_1.expect)(res.json().error).toBe("Payment not found");
    });
    (0, vitest_1.it)("rejects malformed payload with 400", async () => {
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
        (0, vitest_1.expect)(res.statusCode).toBe(400);
        const body = res.json();
        (0, vitest_1.expect)(body.error === "Bad Request" || body.error === "Invalid webhook payload").toBe(true);
    });
});
