"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: zod_1.z.coerce
        .number()
        .default(4000),
    DATABASE_URL: zod_1.z.string().min(1),
    RAZORPAY_KEY_ID: zod_1.z.string().min(1),
    RAZORPAY_KEY_SECRET: zod_1.z.string().min(1),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(32),
});
exports.env = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
});
