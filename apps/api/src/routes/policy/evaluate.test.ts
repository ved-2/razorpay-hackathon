import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { prisma } from "@commerceos/database";

const app = buildApp();

async function registerMerchant(name: string, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      name,
      email,
      password: "password123",
      merchantName: `${name} Store`,
    },
  });
  return res.json();
}

describe("Policy Evaluation Route (POST /policy/evaluate)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("requires authentication", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/policy/evaluate",
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Restock",
          reason: "Demand",
          quantity: 10,
          expectedImpact: "High",
          confidence: 0.9,
        },
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it("evaluates and ALLOWS a compliant proposal", async () => {
    const merchant = await registerMerchant("Policy Store 1", `policy1-${Date.now()}@example.com`);

    const res = await app.inject({
      method: "POST",
      url: "/policy/evaluate",
      headers: { authorization: `Bearer ${merchant.token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Restock Running Shoes",
          reason: "Stock critically low",
          quantity: 25, // default max is 50
          expectedImpact: "Avoid stockouts",
          confidence: 0.92,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.evaluation.allowed).toBe(true);
    expect(body.evaluation.status).toBe("ALLOWED");
    expect(body.evaluation.violations).toEqual([]);
    expect(body.evaluation.requiresApproval).toBe(true);
  });

  it("evaluates and BLOCKS a proposal exceeding restock policy limit", async () => {
    const merchant = await registerMerchant("Policy Store 2", `policy2-${Date.now()}@example.com`);

    const res = await app.inject({
      method: "POST",
      url: "/policy/evaluate",
      headers: { authorization: `Bearer ${merchant.token}` },
      payload: {
        proposal: {
          action: "RESTOCK",
          title: "Excessive Restock",
          reason: "Too much stock",
          quantity: 200, // exceeds max 50
          expectedImpact: "Too much",
          confidence: 0.9,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.evaluation.allowed).toBe(false);
    expect(body.evaluation.status).toBe("BLOCKED");
    expect(body.evaluation.violations.length).toBeGreaterThan(0);
    expect(body.evaluation.violations[0]).toContain("exceeds maximum permitted quantity");
  });

  it("evaluates and BLOCKS a proposal exceeding discount limit", async () => {
    const merchant = await registerMerchant("Policy Store 3", `policy3-${Date.now()}@example.com`);

    const res = await app.inject({
      method: "POST",
      url: "/policy/evaluate",
      headers: { authorization: `Bearer ${merchant.token}` },
      payload: {
        proposal: {
          action: "DISCOUNT",
          title: "Crazy 60% Discount",
          reason: "Over-discounted",
          discountPercent: 60, // exceeds max 20%
          expectedImpact: "Loss",
          confidence: 0.85,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.evaluation.allowed).toBe(false);
    expect(body.evaluation.status).toBe("BLOCKED");
    expect(body.evaluation.violations[0]).toContain("exceeds maximum permitted discount");
  });

  it("evaluates correctly with merchant policy overrides", async () => {
    const merchant = await registerMerchant("Policy Store 4", `policy4-${Date.now()}@example.com`);

    const res = await app.inject({
      method: "POST",
      url: "/policy/evaluate",
      headers: { authorization: `Bearer ${merchant.token}` },
      payload: {
        proposal: {
          action: "DISCOUNT",
          title: "Special 30% Promo",
          reason: "Clearance event",
          discountPercent: 30,
          expectedImpact: "Clear stock",
          confidence: 0.9,
        },
        policyOverrides: {
          maxDiscountPercent: 35, // overrides default 20%
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.evaluation.allowed).toBe(true);
    expect(body.evaluation.status).toBe("ALLOWED");
  });
});
