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
export declare const DEFAULT_MERCHANT_POLICY: MerchantPolicy;
