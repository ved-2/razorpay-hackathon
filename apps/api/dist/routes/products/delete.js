"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductRoute = deleteProductRoute;
const database_1 = require("@commerceos/database");
const authenticate_1 = require("../../plugins/authenticate");
async function deleteProductRoute(app) {
    app.delete("/products/:id", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
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
        await database_1.prisma.product.delete({
            where: {
                id,
            },
        });
        return reply.status(204).send();
    });
}
