"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInventoryRoute = updateInventoryRoute;
const database_1 = require("@commerceos/database");
const zod_1 = require("zod");
const authenticate_1 = require("../../plugins/authenticate");
const inventorySchema = zod_1.z.object({
    quantity: zod_1.z.number().int().nonnegative(),
});
async function updateInventoryRoute(app) {
    app.patch("/variants/:id/inventory", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const parsed = inventorySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parsed.error.flatten(),
            });
        }
        const { merchantId } = request.user;
        const { id } = request.params;
        const variant = await database_1.prisma.productVariant.findFirst({
            where: {
                id,
                product: {
                    merchantId,
                },
            },
        });
        if (!variant) {
            return reply.status(404).send({
                error: "Variant not found",
            });
        }
        const inventory = await database_1.prisma.inventory.update({
            where: {
                variantId: id,
            },
            data: {
                quantity: parsed.data.quantity,
            },
        });
        return {
            inventory,
        };
    });
}
