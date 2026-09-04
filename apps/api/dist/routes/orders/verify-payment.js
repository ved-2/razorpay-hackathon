"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = verifyPaymentRoute;
const database_1 = require("@commerceos/database");
const zod_1 = require("zod");
const authenticate_1 = require("../../plugins/authenticate");
const razorpay_verify_1 = require("../../lib/razorpay-verify");
const verifyPaymentSchema = zod_1.z.object({
    razorpayOrderId: zod_1.z.string().min(1),
    razorpayPaymentId: zod_1.z.string().min(1),
    razorpaySignature: zod_1.z.string().min(1),
});
async function verifyPaymentRoute(app) {
    app.post("/orders/:id/payment/verify", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const params = zod_1.z
            .object({ id: zod_1.z.string().min(1) })
            .safeParse(request.params);
        const body = verifyPaymentSchema.safeParse(request.body);
        if (!params.success || !body.success) {
            return reply.status(400).send({
                error: "Invalid payment verification request",
            });
        }
        const { merchantId } = request.user;
        const { id: orderId } = params.data;
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, } = body.data;
        try {
            const order = await database_1.prisma.order.findFirst({
                where: {
                    id: orderId,
                    merchantId,
                },
                include: {
                    items: true,
                    payments: true,
                },
            });
            if (!order) {
                return reply.status(404).send({
                    error: "Order not found",
                });
            }
            if (order.status === "PAID") {
                const payment = order.payments.find((item) => item.provider === "razorpay" &&
                    item.providerOrderId === razorpayOrderId);
                return reply.send({
                    order,
                    payment,
                });
            }
            if (order.status === "CANCELLED") {
                return reply.status(400).send({
                    error: "Cannot verify payment for a cancelled order",
                });
            }
            const payment = order.payments.find((item) => item.provider === "razorpay" &&
                item.providerOrderId === razorpayOrderId);
            if (!payment) {
                return reply.status(404).send({
                    error: "Payment not found",
                });
            }
            if (payment.status === "VERIFIED") {
                return reply.send({
                    order,
                    payment,
                });
            }
            const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
            const valid = (0, razorpay_verify_1.verifyRazorpaySignature)(payload, razorpaySignature);
            if (!valid) {
                await database_1.prisma.payment.update({
                    where: {
                        id: payment.id,
                    },
                    data: {
                        status: "FAILED",
                    },
                });
                return reply.status(400).send({
                    error: "Invalid payment signature",
                });
            }
            const result = await database_1.prisma.$transaction(async (tx) => {
                const updateResult = await tx.payment.updateMany({
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
                if (updateResult.count === 0) {
                    const currentOrder = await tx.order.findUnique({
                        where: { id: order.id },
                        include: {
                            customer: true,
                            items: true,
                            payments: true,
                        },
                    });
                    const currentPayment = await tx.payment.findUnique({
                        where: { id: payment.id },
                    });
                    return {
                        order: currentOrder,
                        payment: currentPayment,
                    };
                }
                for (const item of order.items) {
                    const updatedInventory = await tx.inventory.updateMany({
                        where: {
                            variantId: item.variantId,
                            quantity: {
                                gte: item.quantity,
                            },
                            reserved: {
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
                    if (updatedInventory.count !== 1) {
                        throw new Error(`Unable to settle inventory for variant ${item.variantId}`);
                    }
                }
                const updatedOrder = await tx.order.update({
                    where: {
                        id: order.id,
                    },
                    data: {
                        status: "PAID",
                    },
                    include: {
                        customer: true,
                        items: true,
                        payments: true,
                    },
                });
                const verifiedPayment = await tx.payment.findUnique({
                    where: { id: payment.id },
                });
                return {
                    order: updatedOrder,
                    payment: verifiedPayment,
                };
            });
            return reply.send(result);
        }
        catch (error) {
            request.log.error(error);
            const message = error instanceof Error
                ? error.message
                : "Unable to verify payment";
            return reply.status(400).send({
                error: message,
            });
        }
    });
}
