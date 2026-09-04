"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRoute = loginRoute;
const database_1 = require("@commerceos/database");
const argon2_1 = __importDefault(require("argon2"));
const zod_1 = require("zod");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
});
async function loginRoute(app) {
    app.post("/auth/login", async (request, reply) => {
        const parsed = loginSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: "Invalid request",
            });
        }
        const { email, password } = parsed.data;
        const user = await database_1.prisma.user.findUnique({
            where: {
                email: email.toLowerCase().trim(),
            },
            include: {
                merchant: true,
            },
        });
        if (!user) {
            return reply.status(401).send({
                error: "Invalid email or password",
            });
        }
        const passwordValid = await argon2_1.default.verify(user.passwordHash, password);
        if (!passwordValid) {
            return reply.status(401).send({
                error: "Invalid email or password",
            });
        }
        const token = await app.jwt.sign({
            userId: user.id,
            merchantId: user.merchantId,
            role: user.role,
        });
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
            token,
        };
    });
}
