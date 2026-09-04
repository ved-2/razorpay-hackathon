"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVariantRoute = updateVariantRoute;
const database_1 = require("@commerceos/database");
const zod_1 = require("zod");
const authenticate_1 = require("../../plugins/authenticate");
const updateVariantSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    price: zod_1.z.number().int().positive().optional(),
    currency: zod_1.z.string().length(3).optional(),
});
async function updateVariantRoute(app) {
    app.patch("/variants/:id", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const parsed = updateVariantSchema.safeParse(request.body);
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
        const updatedVariant = await database_1.prisma.productVariant.update({
            where: {
                id,
            },
            data: parsed.data,
            include: {
                inventory: true,
            },
        });
        return {
            variant: updatedVariant,
        };
    });
}
