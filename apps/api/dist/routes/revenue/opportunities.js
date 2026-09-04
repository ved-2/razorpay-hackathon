"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = revenueOpportunitiesRoute;
const database_1 = require("@commerceos/database");
const authenticate_1 = require("../../plugins/authenticate");
async function revenueOpportunitiesRoute(app) {
    app.get("/revenue/opportunities", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const merchantId = request.user.merchantId;
        const variants = await database_1.prisma.productVariant.findMany({
            where: {
                product: {
                    merchantId,
                },
                inventory: {
                    quantity: {
                        lte: 5,
                    },
                },
            },
            include: {
                product: true,
                inventory: true,
                orderItems: {
                    where: {
                        order: {
                            status: "PAID",
                        },
                    },
                },
            },
        });
        const opportunities = variants
            .filter((variant) => variant.orderItems.length > 0)
            .map((variant) => ({
            type: "LOW_STOCK",
            priority: variant.inventory.quantity <= 2 ? "HIGH" : "MEDIUM",
            product: variant.product.name,
            variant: variant.name,
            sku: variant.sku,
            currentStock: variant.inventory.quantity,
            recentSales: variant.orderItems.reduce((total, item) => total + item.quantity, 0),
            recommendation: `Restock ${Math.max(10 - variant.inventory.quantity, 5)} units`,
        }));
        return reply.send({
            opportunities,
        });
    });
}
