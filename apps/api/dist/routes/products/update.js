"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductRoute = updateProductRoute;
const database_1 = require("@commerceos/database");
const zod_1 = require("zod");
const authenticate_1 = require("../../plugins/authenticate");
const updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(5000).nullable().optional(),
    status: zod_1.z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});
async function updateProductRoute(app) {
    app.patch("/products/:id", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const parsed = updateProductSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parsed.error.flatten(),
            });
        }
        const { merchantId } = request.user;
        const { id } = request.params;
        const existingProduct = await database_1.prisma.product.findFirst({
            where: {
                id,
                merchantId,
            },
        });
        if (!existingProduct) {
            return reply.status(404).send({
                error: "Product not found",
            });
        }
        const product = await database_1.prisma.product.update({
            where: {
                id,
            },
            data: parsed.data,
        });
        return {
            product,
        };
    });
}
