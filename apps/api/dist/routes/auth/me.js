"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRoute = meRoute;
const database_1 = require("@commerceos/database");
const authenticate_1 = require("../../plugins/authenticate");
async function meRoute(app) {
    app.get("/auth/me", {
        preHandler: authenticate_1.authenticate,
    }, async (request, reply) => {
        const { userId } = request.user;
        const user = await database_1.prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                merchant: true,
            },
        });
        if (!user) {
            return reply.status(401).send({
                error: "User not found",
            });
        }
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            merchant: {
                id: user.merchant.id,
                name: user.merchant.name,
                slug: user.merchant.slug,
            },
        };
    });
}
