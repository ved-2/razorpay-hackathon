"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const app_1 = require("../../app");
const database_1 = require("@commerceos/database");
const app = (0, app_1.buildApp)();
(0, vitest_1.describe)("Authentication", () => {
    (0, vitest_1.beforeAll)(async () => {
        await app.ready();
    });
    (0, vitest_1.afterAll)(async () => {
        await app.close();
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("registers a merchant and owner", async () => {
        const email = `test-${Date.now()}@example.com`;
        const response = await app.inject({
            method: "POST",
            url: "/auth/register",
            payload: {
                name: "Test Owner",
                email,
                password: "password123",
                merchantName: "Test Store",
            },
        });
        (0, vitest_1.expect)(response.statusCode).toBe(201);
        const body = response.json();
        (0, vitest_1.expect)(body.user.email).toBe(email);
        (0, vitest_1.expect)(body.user.role).toBe("OWNER");
        (0, vitest_1.expect)(body.merchant.name).toBe("Test Store");
        (0, vitest_1.expect)(body.token).toBeDefined();
    });
    (0, vitest_1.it)("rejects invalid credentials", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/auth/login",
            payload: {
                email: "does-not-exist@example.com",
                password: "wrongpassword",
            },
        });
        (0, vitest_1.expect)(response.statusCode).toBe(401);
    });
});
