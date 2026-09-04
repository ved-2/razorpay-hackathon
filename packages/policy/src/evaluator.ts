import { AIProposal } from "@commerceos/ai";
import {
  DEFAULT_MERCHANT_POLICY,
  MerchantPolicy,
  PolicyEvaluationResult,
} from "./types.js";

export function evaluateProposalPolicy(
  proposal: AIProposal,
  policyOverrides?: Partial<MerchantPolicy>
): PolicyEvaluationResult {
  const policy: MerchantPolicy = {
    ...DEFAULT_MERCHANT_POLICY,
    ...policyOverrides,
  };

  const violations: string[] = [];
  const reasons: string[] = [];

  // 1. Action Authorization
  if (!policy.allowedActions.includes(proposal.action)) {
    violations.push(
      `Action '${proposal.action}' is not authorized under current merchant policy.`
    );
  }

  // 2. Minimum Confidence Threshold
  if (proposal.confidence < policy.minConfidence) {
    violations.push(
      `Proposal confidence score (${proposal.confidence}) is below the required threshold (${policy.minConfidence}).`
    );
  } else {
    reasons.push(
      `Confidence score ${proposal.confidence} meets or exceeds required minimum of ${policy.minConfidence}.`
    );
  }

  // 3. Action-specific constraints
  if (proposal.action === "RESTOCK") {
    if (!proposal.quantity || proposal.quantity <= 0) {
      violations.push("Restock action requires a valid positive quantity.");
    } else if (proposal.quantity > policy.maxRestockQuantity) {
      violations.push(
        `Restock quantity (${proposal.quantity}) exceeds maximum permitted quantity (${policy.maxRestockQuantity}).`
      );
    } else {
      reasons.push(
        `Restock quantity of ${proposal.quantity} units is within policy allowance of ${policy.maxRestockQuantity} units.`
      );
    }
  }

  if (proposal.action === "DISCOUNT") {
    if (
      proposal.discountPercent === undefined ||
      proposal.discountPercent <= 0
    ) {
      violations.push(
        "Discount action requires a positive discount percentage."
      );
    } else if (proposal.discountPercent > policy.maxDiscountPercent) {
      violations.push(
        `Discount (${proposal.discountPercent}%) exceeds maximum permitted discount (${policy.maxDiscountPercent}%).`
      );
    } else {
      reasons.push(
        `Discount of ${proposal.discountPercent}% is within maximum policy limit of ${policy.maxDiscountPercent}%.`
      );
    }
  }

  if (proposal.action === "BUNDLE") {
    if (
      proposal.discountPercent !== undefined &&
      proposal.discountPercent > policy.maxDiscountPercent
    ) {
      violations.push(
        `Bundle discount (${proposal.discountPercent}%) exceeds maximum permitted discount (${policy.maxDiscountPercent}%).`
      );
    }

    if (
      proposal.bundleProductIds &&
      proposal.bundleProductIds.length > 0 &&
      proposal.bundleProductIds.length < 2
    ) {
      violations.push("Bundle action requires at least 2 distinct products.");
    }
  }

  const isAllowed = violations.length === 0;

  return {
    allowed: isAllowed,
    status: isAllowed ? "ALLOWED" : "BLOCKED",
    violations,
    reasons,
    proposal,
    requiresApproval: policy.approvalRequired,
    evaluatedAt: new Date().toISOString(),
  };
}
