import { RevenueOpportunity } from "./revenue";

export type ProposalAction =
  | "RESTOCK"
  | "DISCOUNT"
  | "BUNDLE"
  | "NO_ACTION";

export interface AIProposal {
  action: ProposalAction;
  title: string;
  reason: string;
  quantity?: number;
  discountPercent?: number;
  expectedImpact: string;
  confidence: number;
  targetVariantId?: string;
  targetProductId?: string;
  bundleProductIds?: string[];
}

export interface AIProposeResponse {
  opportunity: RevenueOpportunity;
  proposal: AIProposal;
  context?: Record<string, unknown>;
}

export interface PolicyEvaluation {
  allowed: boolean;
  violations: string[];
  policy?: Record<string, unknown>;
}

export interface PolicyEvaluateResponse {
  evaluation: PolicyEvaluation;
  proposal: AIProposal;
}
