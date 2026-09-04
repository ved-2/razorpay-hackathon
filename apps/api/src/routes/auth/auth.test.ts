import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { prisma } from "@commerceos/database";

const app = buildApp();

describe("Authentication", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("registers a merchant and owner", async () => {
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

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.user.email).toBe(email);
    expect(body.user.role).toBe("OWNER");
    expect(body.merchant.name).toBe("Test Store");
    expect(body.token).toBeDefined();
  });

  it("rejects invalid credentials", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "does-not-exist@example.com",
        password: "wrongpassword",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});