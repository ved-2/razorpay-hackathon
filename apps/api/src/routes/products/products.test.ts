import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { prisma } from "@commerceos/database";

const app = buildApp();

async function registerMerchant(
  email: string,
  merchantName: string
) {
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

describe("Products", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("creates a product for the authenticated merchant", async () => {
    const merchant = await registerMerchant(
      `merchant-${Date.now()}@example.com`,
      "Product Test Store"
    );

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

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.product.name).toBe("Running Shoes");
    expect(body.product.merchantId).toBe(merchant.merchant.id);
  });

  it("does not allow one merchant to access another merchant's product", async () => {
    const merchantA = await registerMerchant(
      `merchant-a-${Date.now()}@example.com`,
      "Merchant A"
    );

    const merchantB = await registerMerchant(
      `merchant-b-${Date.now()}@example.com`,
      "Merchant B"
    );

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

    expect(createResponse.statusCode).toBe(201);

    const productId = createResponse.json().product.id;

    const response = await app.inject({
      method: "GET",
      url: `/products/${productId}`,
      headers: {
        authorization: `Bearer ${merchantB.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("requires authentication", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/products",
    });

    expect(response.statusCode).toBe(401);
  });
});