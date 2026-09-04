"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = cancelOrderRoute;
const database_1 = require("@commerceos/database");
const authenticate_1 = require("../../plugins/authenticate");
async function cancelOrderRoute(app) {
    app.post("/orders/:id/cancel", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const { merchantId } = request.user;
        const { id } = request.params;
        try {
            const result = await database_1.prisma.$transaction(async (tx) => {
                const order = await tx.order.findFirst({
                    where: {
                        id,
                        merchantId,
                    },
                    include: {
                        items: true,
                    },
                });
                if (!order) {
                    throw new Error("Order not found");
                }
                if (order.status !== "PENDING_PAYMENT") {
                    throw new Error(`Order cannot be cancelled from ${order.status} status`);
                }
                for (const item of order.items) {
                    const updated = await tx.inventory.updateMany({
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
                    if (updated.count !== 1) {
                        throw new Error(`Unable to release inventory for ${item.sku}`);
                    }
                }
                return tx.order.update({
                    where: {
                        id: order.id,
                    },
                    data: {
                        status: "CANCELLED",
                    },
                    include: {
                        customer: true,
                        items: true,
                    },
                });
            });
            return reply.send({
                order: result,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to cancel order";
            return reply.status(400).send({
                error: message,
            });
        }
    });
}
