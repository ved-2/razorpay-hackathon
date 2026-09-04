export interface BuyerPolicy {
  maxPrice: number;
  currency: string;
  requiredKeywords?: string[];
  blockedKeywords?: string[];
  preferredMerchantIds?: string[];
}

export interface BuyerProductInput {
  name: string;
  price: number;
  currency: string;
  merchantId?: string;
  sku?: string;
  description?: string;
  productId?: string;
  variantId?: string;
}

export interface BuyerEvaluationResult {
  decision: "BUY" | "SKIP";
  reason: string;
  confidence: number;
  policyPassed: boolean;
  policyViolations: string[];
}
