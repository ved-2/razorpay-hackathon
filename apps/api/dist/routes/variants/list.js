"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listVariantsRoute = listVariantsRoute;
const database_1 = require("@commerceos/database");
const authenticate_1 = require("../../plugins/authenticate");
async function listVariantsRoute(app) {
    app.get("/products/:productId/variants", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const { merchantId } = request.user;
        const { productId } = request.params;
        const product = await database_1.prisma.product.findFirst({
            where: {
                id: productId,
                merchantId,
            },
        });
        if (!product) {
            return reply.status(404).send({
                error: "Product not found",
            });
        }
        const variants = await database_1.prisma.productVariant.findMany({
            where: {
                productId,
            },
            include: {
                inventory: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return {
            variants,
        };
    });
}
