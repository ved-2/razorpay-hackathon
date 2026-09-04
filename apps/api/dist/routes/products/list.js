"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProductsRoute = listProductsRoute;
const database_1 = require("@commerceos/database");
const authenticate_1 = require("../../plugins/authenticate");
async function listProductsRoute(app) {
    app.get("/products", {
        preHandler: authenticate_1.authenticate,
    }, async (request) => {
        const { merchantId } = request.user;
        const products = await database_1.prisma.product.findMany({
            where: {
                merchantId,
            },
            include: {
                variants: {
                    include: {
                        inventory: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return {
            products,
        };
    });
}
