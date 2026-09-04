"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductRoute = getProductRoute;
const database_1 = require("@commerceos/database");
const authenticate_1 = require("../../plugins/authenticate");
async function getProductRoute(app) {
    app.get("/products/:id", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const { merchantId } = request.user;
        const { id } = request.params;
        const product = await database_1.prisma.product.findFirst({
            where: {
                id,
                merchantId,
            },
            include: {
                variants: {
                    include: {
                        inventory: true,
                    },
                },
            },
        });
        if (!product) {
            return reply.status(404).send({
                error: "Product not found",
            });
        }
        return {
            product,
        };
    });
}
