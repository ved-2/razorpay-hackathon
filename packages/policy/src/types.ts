import { AIProposal, AIAction } from "@commerceos/ai";

export interface MerchantPolicy {
  maxDiscountPercent: number;
  maxRestockQuantity: number;
  maxOrderValue: number;
  allowedCurrencies: string[];
  approvalRequired: boolean;
  minConfidence: number;
  allowedActions: AIAction[];
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  status: "ALLOWED" | "BLOCKED";
  violations: string[];
  reasons: string[];
  proposal: AIProposal;
  requiresApproval: boolean;
  evaluatedAt: string;
}

export const DEFAULT_MERCHANT_POLICY: MerchantPolicy = {
  maxDiscountPercent: 20,
  maxRestockQuantity: 50,
  maxOrderValue: 1000000,
  allowedCurrencies: ["INR"],
  approvalRequired: true,
  minConfidence: 0.75,
  allowedActions: ["RESTOCK", "DISCOUNT", "BUNDLE", "NO_ACTION"],
};
