import { createGroqClient } from "../groq.js";
import {
  BuyerEvaluationResult,
  BuyerPolicy,
  BuyerProductInput,
} from "./types.js";

export async function evaluateBuyerDecision(
  product: BuyerProductInput,
  policy: BuyerPolicy,
  apiKey?: string
): Promise<BuyerEvaluationResult> {
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

  // 6. Autonomous LLM Evaluation with Groq
  const client = createGroqClient(apiKey);
  if (client) {
    try {
      const completion = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content:
              "You are an autonomous AI buyer evaluating whether to purchase a commerce item based on merchant data and buyer constraints. Output strictly valid JSON with keys: decision ('BUY' or 'SKIP'), reason (detailed string explaining purchase suitability), confidence (number between 0.8 and 1.0).",
          },
          {
            role: "user",
            content: `Item: ${product.name}
Description: ${product.description || "None"}
SKU: ${product.sku || "None"}
Price: ₹${(product.price / 100).toFixed(2)}
Buyer Max Budget: ₹${(policy.maxPrice / 100).toFixed(2)}
Policy Passed: ${policyPassed}
Violations: ${violations.join("; ") || "None"}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
        temperature: 0.2,
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.reason) {
          const confidence =
            typeof parsed.confidence === "number" && !isNaN(parsed.confidence)
              ? Math.min(Math.max(parsed.confidence, 0.8), 0.99)
              : 0.92;

          return {
            decision: policyPassed ? "BUY" : "SKIP",
            reason: policyPassed
              ? `${parsed.reason} (strictly within the budget limit of ₹${(policy.maxPrice / 100).toFixed(2)})`
              : `${violations.join(". ")}. ${parsed.reason}`,
            confidence,
            policyPassed,
            policyViolations: violations,
          };
        }
      }
    } catch {
      // Fall back to rule-based explanation if Groq request fails
    }
  }

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
