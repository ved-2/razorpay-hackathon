import { describe, expect, it } from "vitest";
import { RevenueOpportunity } from "@commerceos/domain";
import {
  aiProposalSchema,
  createOpportunityAgent,
  runOpportunityAgent,
  generateDeterministicProposal,
} from "../src/index.js";

describe("CommerceOS AI Package", () => {
  describe("aiProposalSchema Validation", () => {
    it("accepts a valid RESTOCK proposal", () => {
      const valid = {
        action: "RESTOCK",
        title: "Restock Running Shoes",
        reason: "Available stock is low compared to demand.",
        quantity: 15,
        expectedImpact: "Prevent stockouts",
        confidence: 0.95,
      };

      const result = aiProposalSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts a valid DISCOUNT proposal", () => {
      const valid = {
        action: "DISCOUNT",
        title: "Flash Discount on Socks",
        reason: "Stimulate slow moving variant.",
        discountPercent: 15,
        expectedImpact: "Increase conversions",
        confidence: 0.85,
      };

      const result = aiProposalSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects an invalid action", () => {
      const invalid = {
        action: "PURGE_DATABASE",
        title: "Invalid",
        reason: "Should fail",
        expectedImpact: "None",
        confidence: 0.5,
      };

      const result = aiProposalSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects confidence out of bounds (> 1.0 or < 0.0)", () => {
      const invalid = {
        action: "RESTOCK",
        title: "Restock",
        reason: "Reason",
        quantity: 10,
        expectedImpact: "Impact",
        confidence: 1.5,
      };

      const result = aiProposalSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Deterministic Proposal Generation Fallback", () => {
    it("generates RESTOCK proposal for LOW_STOCK opportunity", () => {
      const opp: RevenueOpportunity = {
        id: "opp_1",
        type: "LOW_STOCK",
        priority: "HIGH",
        title: "Low Stock: Test Item",
        description: "Only 2 left",
        recommendation: "Restock 10 units",
        data: {
          product: "Running Shoes",
          variant: "Size 9",
          availableStock: 2,
          recentSales: 8,
          recommendedRestock: 13,
        },
      };

      const proposal = generateDeterministicProposal(opp);
      expect(proposal.action).toBe("RESTOCK");
      expect(proposal.quantity).toBe(13);
      expect(proposal.confidence).toBeGreaterThan(0.9);
    });

    it("generates BUNDLE proposal for CROSS_SELL opportunity", () => {
      const opp: RevenueOpportunity = {
        id: "opp_2",
        type: "CROSS_SELL",
        priority: "MEDIUM",
        title: "Bundle Opportunity",
        description: "Shoes + Socks",
        recommendation: "Create bundle",
        data: {
          products: ["Running Shoes", "Cotton Socks"],
          productIds: ["prod_1", "prod_2"],
          occurrences: 3,
        },
      };

      const proposal = generateDeterministicProposal(opp);
      expect(proposal.action).toBe("BUNDLE");
      expect(proposal.discountPercent).toBe(10);
      expect(proposal.bundleProductIds).toEqual(["prod_1", "prod_2"]);
    });

    it("generates DISCOUNT proposal for LOW_CONVERSION opportunity", () => {
      const opp: RevenueOpportunity = {
        id: "opp_3",
        type: "LOW_CONVERSION",
        priority: "LOW",
        title: "Zero Sales Item",
        description: "No sales yet",
        recommendation: "Discount item",
        data: {
          product: "Obscure Hat",
          productId: "prod_hat",
          paidSales: 0,
        },
      };

      const proposal = generateDeterministicProposal(opp);
      expect(proposal.action).toBe("DISCOUNT");
      expect(proposal.discountPercent).toBe(15);
      expect(proposal.targetProductId).toBe("prod_hat");
    });
  });

  describe("LangGraph Agent Execution", () => {
    it("executes the full LangGraph pipeline from Opportunity to Validated Proposal", async () => {
      const opportunity: RevenueOpportunity = {
        id: "opp_graph_1",
        type: "LOW_STOCK",
        priority: "HIGH",
        title: "Low Stock: Performance Runner",
        description: "Stock is low",
        recommendation: "Restock 12 units",
        data: {
          product: "Performance Runner",
          variant: "Black",
          availableStock: 1,
          recentSales: 5,
          recommendedRestock: 14,
        },
      };

      const result = await runOpportunityAgent(opportunity, "merchant_test_123");

      expect(result.proposal).toBeDefined();
      expect(result.proposal?.action).toBe("RESTOCK");
      expect(result.proposal?.quantity).toBe(14);
      expect(result.proposal?.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.errors?.length ?? 0).toBe(0);
    });
  });
});
