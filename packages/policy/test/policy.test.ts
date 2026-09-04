import { describe, expect, it } from "vitest";
import { AIProposal } from "@commerceos/ai";
import {
  evaluateProposalPolicy,
  DEFAULT_MERCHANT_POLICY,
} from "../src/index.js";

describe("Policy Engine (@commerceos/policy)", () => {
  it("allows a compliant RESTOCK proposal", () => {
    const proposal: AIProposal = {
      action: "RESTOCK",
      title: "Restock Running Shoes",
      reason: "Stock depleted by sales.",
      quantity: 20, // <= 50
      expectedImpact: "Prevent stockout",
      confidence: 0.92,
    };

    const result = evaluateProposalPolicy(proposal);
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("ALLOWED");
    expect(result.violations.length).toBe(0);
    expect(result.requiresApproval).toBe(true);
  });

  it("blocks a RESTOCK proposal that exceeds maximum restock limit", () => {
    const proposal: AIProposal = {
      action: "RESTOCK",
      title: "Massive Restock",
      reason: "High velocity.",
      quantity: 150, // exceeds default 50
      expectedImpact: "Keep stock",
      confidence: 0.9,
    };

    const result = evaluateProposalPolicy(proposal);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(result.violations.some((v) => v.includes("exceeds maximum permitted quantity"))).toBe(true);
  });

  it("allows a compliant DISCOUNT proposal", () => {
    const proposal: AIProposal = {
      action: "DISCOUNT",
      title: "10% Off Shoes",
      reason: "Clear older stock.",
      discountPercent: 10, // <= 20%
      expectedImpact: "Clear inventory",
      confidence: 0.85,
    };

    const result = evaluateProposalPolicy(proposal);
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("ALLOWED");
  });

  it("blocks a DISCOUNT proposal that exceeds maximum discount limit", () => {
    const proposal: AIProposal = {
      action: "DISCOUNT",
      title: "Huge 50% Sale",
      reason: "Aggressive clearance.",
      discountPercent: 50, // exceeds 20%
      expectedImpact: "Sell everything",
      confidence: 0.88,
    };

    const result = evaluateProposalPolicy(proposal);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(result.violations.some((v) => v.includes("exceeds maximum permitted discount"))).toBe(true);
  });

  it("blocks a proposal with confidence score below policy threshold", () => {
    const proposal: AIProposal = {
      action: "RESTOCK",
      title: "Uncertain Restock",
      reason: "Maybe need stock.",
      quantity: 10,
      expectedImpact: "Unsure",
      confidence: 0.5, // below default minConfidence (0.75)
    };

    const result = evaluateProposalPolicy(proposal);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(result.violations.some((v) => v.includes("below the required threshold"))).toBe(true);
  });

  it("blocks unauthorized actions not in policy allowed list", () => {
    const proposal: AIProposal = {
      action: "NO_ACTION",
      title: "Do nothing",
      reason: "None",
      expectedImpact: "None",
      confidence: 0.9,
    };

    // Override policy to exclude NO_ACTION
    const result = evaluateProposalPolicy(proposal, {
      allowedActions: ["RESTOCK", "DISCOUNT"],
    });

    expect(result.allowed).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(result.violations.some((v) => v.includes("not authorized"))).toBe(true);
  });

  it("supports merchant-specific policy overrides", () => {
    const proposal: AIProposal = {
      action: "DISCOUNT",
      title: "25% Merchant Special",
      reason: "Black Friday promo.",
      discountPercent: 25,
      expectedImpact: "High volume",
      confidence: 0.9,
    };

    // Default policy blocks 25% (max is 20%)
    expect(evaluateProposalPolicy(proposal).allowed).toBe(false);

    // With merchant override maxDiscountPercent = 30% -> Allowed!
    const customResult = evaluateProposalPolicy(proposal, {
      maxDiscountPercent: 30,
    });
    expect(customResult.allowed).toBe(true);
    expect(customResult.status).toBe("ALLOWED");
  });
});
