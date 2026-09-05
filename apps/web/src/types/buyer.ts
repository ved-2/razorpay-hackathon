export interface BuyerPolicy {
  maxPrice: number; // in paise
  currency: string;
  requiredKeywords?: string[];
  blockedKeywords?: string[];
  preferredMerchantIds?: string[];
}

export interface BuyerEvaluation {
  decision: "BUY" | "REJECT";
  confidence: number;
  reason: string;
  evaluationDetails?: {
    withinBudget: boolean;
    hasRequiredKeywords: boolean;
    hasBlockedKeywords: boolean;
    matchedKeywords: string[];
    blockedMatches: string[];
  };
}

export interface BuyerEvaluateResponse {
  evaluation: BuyerEvaluation;
  product: Record<string, unknown>;
}

export interface BuyerCheckoutResponse {
  success: boolean;
  order: {
    id: string;
    status: string;
    currency: string;
    total: number;
  };
  payment: {
    id: string;
    provider: string;
    providerOrderId: string;
    amount: number;
    currency: string;
    status: string;
    razorpayKeyId: string;
  };
  approvalRequired?: boolean;
  approval?: {
    id: string;
    status: string;
    title: string;
  } | null;
}
