import {
  BuyerEvaluationResult,
  BuyerPolicy,
  BuyerProductInput,
} from "./types.js";

export function evaluateBuyerDecision(
  product: BuyerProductInput,
  policy: BuyerPolicy
): BuyerEvaluationResult {
  const violations: string[] = [];

  // 1. Currency validation
  if (product.currency.toUpperCase() !== policy.currency.toUpperCase()) {
    violations.push(
      `Currency mismatch: product is in ${product.currency} but buyer policy requires ${policy.currency}`
    );
  }

  // 2. Budget / Max price constraint
  if (product.price > policy.maxPrice) {
    violations.push(
      `Price ₹${(product.price / 100).toFixed(2)} exceeds maximum buyer budget of ₹${(policy.maxPrice / 100).toFixed(2)}`
    );
  }

  // 3. Blocked keywords check
  const textToScan = `${product.name} ${product.description ?? ""} ${product.sku ?? ""}`.toLowerCase();

  if (policy.blockedKeywords && policy.blockedKeywords.length > 0) {
    for (const blocked of policy.blockedKeywords) {
      if (textToScan.includes(blocked.toLowerCase())) {
        violations.push(
          `Product contains blocked keyword: "${blocked}"`
        );
      }
    }
  }

  // 4. Required keywords check
  if (policy.requiredKeywords && policy.requiredKeywords.length > 0) {
    const hasRequiredKeyword = policy.requiredKeywords.some((keyword) =>
      textToScan.includes(keyword.toLowerCase())
    );

    if (!hasRequiredKeyword) {
      violations.push(
        `Product does not match any required buyer keywords: [${policy.requiredKeywords.join(", ")}]`
      );
    }
  }

  // 5. Merchant preferences check
  if (
    policy.preferredMerchantIds &&
    policy.preferredMerchantIds.length > 0 &&
    product.merchantId
  ) {
    if (!policy.preferredMerchantIds.includes(product.merchantId)) {
      violations.push(
        `Merchant ${product.merchantId} is not in the buyer's approved merchant list`
      );
    }
  }

  const policyPassed = violations.length === 0;

  if (!policyPassed) {
    return {
      decision: "SKIP",
      reason: violations.join(". "),
      confidence: 0.95,
      policyPassed: false,
      policyViolations: violations,
    };
  }

  return {
    decision: "BUY",
    reason: `Product '${product.name}' strictly satisfies all buyer criteria and price ₹${(product.price / 100).toFixed(2)} is well within the budget limit of ₹${(policy.maxPrice / 100).toFixed(2)}.`,
    confidence: 0.92,
    policyPassed: true,
    policyViolations: [],
  };
}
