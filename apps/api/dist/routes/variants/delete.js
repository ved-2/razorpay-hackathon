"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVariantRoute = deleteVariantRoute;
const database_1 = require("@commerceos/database");
const authenticate_1 = require("../../plugins/authenticate");
async function deleteVariantRoute(app) {
    app.delete("/variants/:id", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
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
        await database_1.prisma.productVariant.delete({
            where: {
                id,
            },
        });
        return reply.status(204).send();
    });
}
