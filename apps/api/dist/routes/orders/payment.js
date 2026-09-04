"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createPaymentRoute;
require("dotenv/config");
const database_1 = require("@commerceos/database");
const zod_1 = require("zod");
const authenticate_1 = require("../../plugins/authenticate");
const razorpay_1 = require("../../lib/razorpay");
const env_1 = require("../../config/env");
const paramsSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
async function createPaymentRoute(app) {
    app.post("/orders/:id/payment", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const params = paramsSchema.safeParse(request.params);
        if (!params.success) {
            return reply.status(400).send({
                error: "Invalid order ID",
            });
        }
        const { merchantId } = request.user;
        const { id: orderId } = params.data;
        try {
            const order = await database_1.prisma.order.findFirst({
                where: {
                    id: orderId,
                    merchantId,
                },
                include: {
                    payments: true,
                },
            });
            if (!order) {
                return reply.status(404).send({
                    error: "Order not found",
                });
            }
            if (order.status !== "PENDING_PAYMENT") {
                return reply.status(400).send({
                    error: "Order is not awaiting payment",
                });
            }
            const existingPayment = order.payments.find((payment) => payment.provider === "razorpay" &&
                payment.status !== "FAILED");
            if (existingPayment?.providerOrderId) {
                return reply.send({
                    payment: {
                        id: existingPayment.id,
                        orderId: existingPayment.orderId,
                        provider: existingPayment.provider,
                        providerOrderId: existingPayment.providerOrderId,
                        amount: existingPayment.amount,
                        currency: existingPayment.currency,
                        status: existingPayment.status,
                        razorpayKeyId: env_1.env.RAZORPAY_KEY_ID,
                    },
                });
            }
            const razorpayOrder = await razorpay_1.razorpay.orders.create({
                amount: order.total,
                currency: order.currency,
                receipt: order.id,
                notes: {
                    commerceosOrderId: order.id,
                    merchantId: order.merchantId,
                },
            });
            const payment = await database_1.prisma.payment.create({
                data: {
                    orderId: order.id,
                    provider: "razorpay",
                    providerOrderId: razorpayOrder.id,
                    amount: order.total,
                    currency: order.currency,
                    status: "CREATED",
                },
            });
            return reply.status(201).send({
                payment: {
                    id: payment.id,
                    orderId: payment.orderId,
                    provider: payment.provider,
                    providerOrderId: payment.providerOrderId,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    razorpayKeyId: env_1.env.RAZORPAY_KEY_ID,
                },
            });
        }
        catch (error) {
            request.log.error(error);
            return reply.status(502).send({
                error: "Unable to create payment",
            });
        }
    });
}
