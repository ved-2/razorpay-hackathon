"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const app_1 = require("../../app");
const database_1 = require("@commerceos/database");
const app = (0, app_1.buildApp)();
async function registerMerchant(email, merchantName) {
    const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
            name: "Test Owner",
            email,
            password: "password123",
            merchantName,
        },
    });
    return response.json();
}
(0, vitest_1.describe)("Products", () => {
    (0, vitest_1.beforeAll)(async () => {
        await app.ready();
    });
    (0, vitest_1.afterAll)(async () => {
        await app.close();
        await database_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("creates a product for the authenticated merchant", async () => {
        const merchant = await registerMerchant(`merchant-${Date.now()}@example.com`, "Product Test Store");
        const response = await app.inject({
            method: "POST",
            url: "/products",
            headers: {
                authorization: `Bearer ${merchant.token}`,
            },
            payload: {
                name: "Running Shoes",
                description: "Test product",
            },
        });
        (0, vitest_1.expect)(response.statusCode).toBe(201);
        const body = response.json();
        (0, vitest_1.expect)(body.product.name).toBe("Running Shoes");
        (0, vitest_1.expect)(body.product.merchantId).toBe(merchant.merchant.id);
    });
    (0, vitest_1.it)("does not allow one merchant to access another merchant's product", async () => {
        const merchantA = await registerMerchant(`merchant-a-${Date.now()}@example.com`, "Merchant A");
        const merchantB = await registerMerchant(`merchant-b-${Date.now()}@example.com`, "Merchant B");
        const createResponse = await app.inject({
            method: "POST",
            url: "/products",
            headers: {
                authorization: `Bearer ${merchantA.token}`,
            },
            payload: {
                name: "Merchant A Product",
            },
        });
        (0, vitest_1.expect)(createResponse.statusCode).toBe(201);
        const productId = createResponse.json().product.id;
        const response = await app.inject({
            method: "GET",
            url: `/products/${productId}`,
            headers: {
                authorization: `Bearer ${merchantB.token}`,
            },
        });
        (0, vitest_1.expect)(response.statusCode).toBe(404);
    });
    (0, vitest_1.it)("requires authentication", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/products",
        });
        (0, vitest_1.expect)(response.statusCode).toBe(401);
    });
});
