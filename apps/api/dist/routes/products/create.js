"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductRoute = createProductRoute;
const database_1 = require("@commerceos/database");
const zod_1 = require("zod");
const authenticate_1 = require("../../plugins/authenticate");
const createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
});
async function createProductRoute(app) {
    app.post("/products", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const parsed = createProductSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parsed.error.flatten(),
            });
        }
        const { merchantId } = request.user;
        const product = await database_1.prisma.product.create({
            data: {
                name: parsed.data.name,
                description: parsed.data.description,
                merchantId,
            },
        });
        return reply.status(201).send({
            product,
        });
    });
}
