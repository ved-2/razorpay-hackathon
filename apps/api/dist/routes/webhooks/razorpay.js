"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = razorpayWebhookRoute;
const database_1 = require("@commerceos/database");
const razorpay_verify_1 = require("../../lib/razorpay-verify");
const env_1 = require("../../config/env");
async function razorpayWebhookRoute(app) {
    app.post("/webhooks/razorpay", {
        config: {
            rawBody: true,
        },
    }, async (request, reply) => {
        const signature = request.headers["x-razorpay-signature"];
        const eventId = request.headers["x-razorpay-event-id"];
        if (typeof signature !== "string") {
            return reply.status(400).send({
                error: "Missing Razorpay signature",
            });
        }
        if (typeof eventId !== "string") {
            return reply.status(400).send({
                error: "Missing Razorpay event ID",
            });
        }
        const rawBody = request.rawBody;
        if (!rawBody) {
            return reply.status(400).send({
                error: "Missing raw request body",
            });
        }
        const valid = (0, razorpay_verify_1.verifyRazorpaySignature)(rawBody, signature, env_1.env.RAZORPAY_WEBHOOK_SECRET);
        if (!valid) {
            return reply.status(400).send({
                error: "Invalid webhook signature",
            });
        }
        let payload;
        try {
            payload = JSON.parse(rawBody);
        }
        catch {
            return reply.status(400).send({
                error: "Invalid webhook payload",
            });
        }
        const event = payload.event;
        const webhookResult = await database_1.prisma.webhookEvent.createMany({
            data: [
                {
                    provider: "razorpay",
                    eventId,
                    event: event ?? "unknown",
                },
            ],
            skipDuplicates: true,
        });
        if (webhookResult.count === 0) {
            return reply.send({
                received: true,
                duplicate: true,
            });
        }
        if (event !== "payment.captured" &&
            event !== "payment.failed") {
            return reply.send({
                received: true,
            });
        }
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity) {
            await database_1.prisma.webhookEvent.deleteMany({
                where: {
                    provider: "razorpay",
                    eventId,
                },
            });
            return reply.status(400).send({
                error: "Missing payment entity",
            });
        }
        const razorpayOrderId = paymentEntity.order_id;
        const razorpayPaymentId = paymentEntity.id;
        const payment = await database_1.prisma.payment.findFirst({
            where: {
                provider: "razorpay",
                providerOrderId: razorpayOrderId,
            },
        });
        if (!payment) {
            await database_1.prisma.webhookEvent.deleteMany({
                where: {
                    provider: "razorpay",
                    eventId,
                },
            });
            return reply.status(404).send({
                error: "Payment not found",
            });
        }
        try {
            if (event === "payment.captured") {
                await database_1.prisma.$transaction(async (tx) => {
                    const updated = await tx.payment.updateMany({
                        where: {
                            id: payment.id,
                            status: {
                                not: "VERIFIED",
                            },
                        },
                        data: {
                            providerPaymentId: razorpayPaymentId,
                            status: "VERIFIED",
                        },
                    });
                    if (updated.count === 1) {
                        const order = await tx.order.findUnique({
                            where: {
                                id: payment.orderId,
                            },
                            include: {
                                items: true,
                            },
                        });
                        if (!order) {
                            throw new Error("Order not found");
                        }
                        for (const item of order.items) {
                            const inventoryUpdate = await tx.inventory.updateMany({
                                where: {
                                    variantId: item.variantId,
                                    reserved: {
                                        gte: item.quantity,
                                    },
                                    quantity: {
                                        gte: item.quantity,
                                    },
                                },
                                data: {
                                    quantity: {
                                        decrement: item.quantity,
                                    },
                                    reserved: {
                                        decrement: item.quantity,
                                    },
                                },
                            });
                            if (inventoryUpdate.count !== 1) {
                                throw new Error(`Failed to finalize inventory for variant ${item.variantId}`);
                            }
                        }
                        await tx.order.update({
                            where: {
                                id: payment.orderId,
                            },
                            data: {
                                status: "PAID",
                            },
                        });
                    }
                });
            }
            if (event === "payment.failed") {
                await database_1.prisma.$transaction(async (tx) => {
                    const updated = await tx.payment.updateMany({
                        where: {
                            id: payment.id,
                            status: {
                                not: "VERIFIED",
                            },
                        },
                        data: {
                            providerPaymentId: razorpayPaymentId,
                            status: "FAILED",
                        },
                    });
                    if (updated.count !== 1) {
                        return;
                    }
                    const order = await tx.order.findUnique({
                        where: {
                            id: payment.orderId,
                        },
                        include: {
                            items: true,
                        },
                    });
                    if (!order || order.status !== "PENDING_PAYMENT") {
                        return;
                    }
                    for (const item of order.items) {
                        await tx.inventory.updateMany({
                            where: {
                                variantId: item.variantId,
                                reserved: {
                                    gte: item.quantity,
                                },
                            },
                            data: {
                                reserved: {
                                    decrement: item.quantity,
                                },
                            },
                        });
                    }
                    await tx.order.update({
                        where: {
                            id: order.id,
                        },
                        data: {
                            status: "CANCELLED",
                        },
                    });
                });
            }
            return reply.send({
                received: true,
            });
        }
        catch (error) {
            request.log.error(error);
            await database_1.prisma.webhookEvent.deleteMany({
                where: {
                    provider: "razorpay",
                    eventId,
                },
            });
            return reply.status(500).send({
                error: "Webhook processing failed",
            });
        }
    });
}
