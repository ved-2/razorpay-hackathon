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
    const email = `settle-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const registerRes = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
            name: "Settlement Owner",
            email,
            password: "password123",
            merchantName: "Settlement Store",
        },
    });
    const { token, merchant } = registerRes.json();
    const productRes = await app.inject({
        method: "POST",
        url: "/products",
        headers: { authorization: `Bearer ${token}` },
        payload: {
            name: "Settlement Shoes",
            description: "Test product for settlement",
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
                name: "Test Customer",
                email: "customer@example.com",
            },
            items,
        },
    });
    return res.json().order;
}
function generateSignature(orderId, paymentId) {
    return node_crypto_1.default
        .createHmac("sha256", env_1.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
}
(0, vitest_1.describe)("Inventory Settlement on Payment Verification", () => {
    (0, vitest_1.beforeAll)(async () => {
        await app.ready();
    });
    (0, vitest_1.afterAll)(async () => {
        await app.close();
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("settles inventory for a single-item order upon verified payment", async () => {
        const { token, product } = await setupTestMerchant();
        const sku = `SKU-SINGLE-${Date.now()}`;
        const variant = await createVariant(token, product.id, sku, 100000, 10);
        // Initial stock: quantity = 10, reserved = 0
        // Create order for 2 units -> quantity = 10, reserved = 2
        const order = await createOrder(token, [{ variantId: variant.id, quantity: 2 }]);
        (0, vitest_1.expect)(order.status).toBe("PENDING_PAYMENT");
        const rzpOrderId = `order_single_${Date.now()}`;
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
        const rzpPaymentId = `pay_single_${Date.now()}`;
        const signature = generateSignature(rzpOrderId, rzpPaymentId);
        const verifyRes = await app.inject({
            method: "POST",
            url: `/orders/${order.id}/payment/verify`,
            headers: { authorization: `Bearer ${token}` },
            payload: {
                razorpayOrderId: rzpOrderId,
                razorpayPaymentId: rzpPaymentId,
                razorpaySignature: signature,
            },
        });
        (0, vitest_1.expect)(verifyRes.statusCode).toBe(200);
        const body = verifyRes.json();
        (0, vitest_1.expect)(body.order.status).toBe("PAID");
        (0, vitest_1.expect)(body.payment.status).toBe("VERIFIED");
        // Check inventory: quantity was 10, now 8; reserved was 2, now 0
        const updatedInventory = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant.id },
        });
        (0, vitest_1.expect)(updatedInventory?.quantity).toBe(8);
        (0, vitest_1.expect)(updatedInventory?.reserved).toBe(0);
    });
    (0, vitest_1.it)("settles inventory for a multi-item order upon verified payment", async () => {
        const { token, product } = await setupTestMerchant();
        const sku1 = `SKU-MULTI-1-${Date.now()}`;
        const sku2 = `SKU-MULTI-2-${Date.now()}`;
        const variant1 = await createVariant(token, product.id, sku1, 50000, 10);
        const variant2 = await createVariant(token, product.id, sku2, 75000, 20);
        // Order 2 units of variant1, 3 units of variant2
        const order = await createOrder(token, [
            { variantId: variant1.id, quantity: 2 },
            { variantId: variant2.id, quantity: 3 },
        ]);
        const rzpOrderId = `order_multi_${Date.now()}`;
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
        const rzpPaymentId = `pay_multi_${Date.now()}`;
        const signature = generateSignature(rzpOrderId, rzpPaymentId);
        const verifyRes = await app.inject({
            method: "POST",
            url: `/orders/${order.id}/payment/verify`,
            headers: { authorization: `Bearer ${token}` },
            payload: {
                razorpayOrderId: rzpOrderId,
                razorpayPaymentId: rzpPaymentId,
                razorpaySignature: signature,
            },
        });
        (0, vitest_1.expect)(verifyRes.statusCode).toBe(200);
        const inv1 = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant1.id },
        });
        const inv2 = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant2.id },
        });
        // variant1: 10 - 2 = 8, reserved 2 - 2 = 0
        (0, vitest_1.expect)(inv1?.quantity).toBe(8);
        (0, vitest_1.expect)(inv1?.reserved).toBe(0);
        // variant2: 20 - 3 = 17, reserved 3 - 3 = 0
        (0, vitest_1.expect)(inv2?.quantity).toBe(17);
        (0, vitest_1.expect)(inv2?.reserved).toBe(0);
    });
    (0, vitest_1.it)("protects against insufficient inventory during settlement", async () => {
        const { token, product } = await setupTestMerchant();
        const sku = `SKU-INSUFF-${Date.now()}`;
        const variant = await createVariant(token, product.id, sku, 100000, 5);
        const order = await createOrder(token, [{ variantId: variant.id, quantity: 2 }]);
        const rzpOrderId = `order_insuff_${Date.now()}`;
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
        // Simulate inventory corruption/shortage: physical stock dropped below required settlement
        await database_1.prisma.inventory.update({
            where: { variantId: variant.id },
            data: { quantity: 1 }, // Less than item.quantity (2)
        });
        const rzpPaymentId = `pay_insuff_${Date.now()}`;
        const signature = generateSignature(rzpOrderId, rzpPaymentId);
        const verifyRes = await app.inject({
            method: "POST",
            url: `/orders/${order.id}/payment/verify`,
            headers: { authorization: `Bearer ${token}` },
            payload: {
                razorpayOrderId: rzpOrderId,
                razorpayPaymentId: rzpPaymentId,
                razorpaySignature: signature,
            },
        });
        // Should fail cleanly
        (0, vitest_1.expect)(verifyRes.statusCode).toBe(400);
        // Order should remain PENDING_PAYMENT, payment should not be VERIFIED
        const dbOrder = await database_1.prisma.order.findUnique({ where: { id: order.id } });
        (0, vitest_1.expect)(dbOrder?.status).toBe("PENDING_PAYMENT");
        const dbPayment = await database_1.prisma.payment.findFirst({
            where: { orderId: order.id, providerOrderId: rzpOrderId },
        });
        (0, vitest_1.expect)(dbPayment?.status).not.toBe("VERIFIED");
    });
    (0, vitest_1.it)("is idempotent: duplicate payment verification does not deduct inventory twice", async () => {
        const { token, product } = await setupTestMerchant();
        const sku = `SKU-DUP-${Date.now()}`;
        const variant = await createVariant(token, product.id, sku, 100000, 10);
        const order = await createOrder(token, [{ variantId: variant.id, quantity: 2 }]);
        const rzpOrderId = `order_dup_${Date.now()}`;
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
        const rzpPaymentId = `pay_dup_${Date.now()}`;
        const signature = generateSignature(rzpOrderId, rzpPaymentId);
        // First verification
        const firstRes = await app.inject({
            method: "POST",
            url: `/orders/${order.id}/payment/verify`,
            headers: { authorization: `Bearer ${token}` },
            payload: {
                razorpayOrderId: rzpOrderId,
                razorpayPaymentId: rzpPaymentId,
                razorpaySignature: signature,
            },
        });
        (0, vitest_1.expect)(firstRes.statusCode).toBe(200);
        const invAfterFirst = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant.id },
        });
        (0, vitest_1.expect)(invAfterFirst?.quantity).toBe(8);
        (0, vitest_1.expect)(invAfterFirst?.reserved).toBe(0);
        // Second verification (duplicate attempt)
        const secondRes = await app.inject({
            method: "POST",
            url: `/orders/${order.id}/payment/verify`,
            headers: { authorization: `Bearer ${token}` },
            payload: {
                razorpayOrderId: rzpOrderId,
                razorpayPaymentId: rzpPaymentId,
                razorpaySignature: signature,
            },
        });
        (0, vitest_1.expect)(secondRes.statusCode).toBe(200);
        // Inventory should remain unchanged (not deducted again to 6)
        const invAfterSecond = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant.id },
        });
        (0, vitest_1.expect)(invAfterSecond?.quantity).toBe(8);
        (0, vitest_1.expect)(invAfterSecond?.reserved).toBe(0);
    });
    (0, vitest_1.it)("rolls back all changes if any item in multi-item settlement fails", async () => {
        const { token, product } = await setupTestMerchant();
        const sku1 = `SKU-ROLL-1-${Date.now()}`;
        const sku2 = `SKU-ROLL-2-${Date.now()}`;
        const variant1 = await createVariant(token, product.id, sku1, 50000, 10);
        const variant2 = await createVariant(token, product.id, sku2, 75000, 10);
        const order = await createOrder(token, [
            { variantId: variant1.id, quantity: 2 },
            { variantId: variant2.id, quantity: 2 },
        ]);
        const rzpOrderId = `order_roll_${Date.now()}`;
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
        // Make variant2 inventory insufficient to settle, but variant1 is valid
        await database_1.prisma.inventory.update({
            where: { variantId: variant2.id },
            data: { reserved: 0 }, // cannot decrement reserved by 2
        });
        const rzpPaymentId = `pay_roll_${Date.now()}`;
        const signature = generateSignature(rzpOrderId, rzpPaymentId);
        const verifyRes = await app.inject({
            method: "POST",
            url: `/orders/${order.id}/payment/verify`,
            headers: { authorization: `Bearer ${token}` },
            payload: {
                razorpayOrderId: rzpOrderId,
                razorpayPaymentId: rzpPaymentId,
                razorpaySignature: signature,
            },
        });
        (0, vitest_1.expect)(verifyRes.statusCode).toBe(400);
        // Variant 1 inventory should be ROLLED BACK (not decremented)
        const inv1 = await database_1.prisma.inventory.findUnique({
            where: { variantId: variant1.id },
        });
        (0, vitest_1.expect)(inv1?.quantity).toBe(10);
        (0, vitest_1.expect)(inv1?.reserved).toBe(2);
        // Order status remains PENDING_PAYMENT
        const dbOrder = await database_1.prisma.order.findUnique({ where: { id: order.id } });
        (0, vitest_1.expect)(dbOrder?.status).toBe("PENDING_PAYMENT");
        // Payment is NOT verified
        const dbPayment = await database_1.prisma.payment.findFirst({
            where: { orderId: order.id, providerOrderId: rzpOrderId },
        });
        (0, vitest_1.expect)(dbPayment?.status).toBe("CREATED");
    });
});
