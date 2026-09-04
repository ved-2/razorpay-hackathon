"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVariantRoute = createVariantRoute;
const database_1 = require("@commerceos/database");
const zod_1 = require("zod");
const authenticate_1 = require("../../plugins/authenticate");
const createVariantSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    sku: zod_1.z.string().min(1).max(100),
    price: zod_1.z.number().int().positive(),
    currency: zod_1.z.string().length(3).default("INR"),
    quantity: zod_1.z.number().int().nonnegative().default(0),
});
async function createVariantRoute(app) {
    app.post("/products/:productId/variants", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const parsed = createVariantSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parsed.error.flatten(),
            });
        }
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
        const existingSku = await database_1.prisma.productVariant.findUnique({
            where: {
                sku: parsed.data.sku,
            },
        });
        if (existingSku) {
            return reply.status(409).send({
                error: "SKU already exists",
            });
        }
        const variant = await database_1.prisma.productVariant.create({
            data: {
                productId,
                name: parsed.data.name,
                sku: parsed.data.sku,
                price: parsed.data.price,
                currency: parsed.data.currency,
                inventory: {
                    create: {
                        quantity: parsed.data.quantity,
                    },
                },
            },
            include: {
                inventory: true,
            },
        });
        return reply.status(201).send({
            variant,
        });
    });
}
