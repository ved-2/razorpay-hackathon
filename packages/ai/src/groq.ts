import Groq from "groq-sdk";
import { RevenueOpportunity } from "@commerceos/domain";
import { OpportunityContext } from "./state.js";
import { AIProposal, aiProposalSchema } from "./schema.js";

const DEFAULT_MODELS = [
  process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "groq/compound",
  "llama-3.3-70b-versatile",
];

export function createGroqClient(apiKey?: string): Groq | null {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) {
    return null;
  }
  return new Groq({ apiKey: key });
}

export function buildOpportunityPrompt(
  opportunity: RevenueOpportunity,
  context?: OpportunityContext
): string {
  return `You are CommerceOS AI, an expert agentic commerce operating system for merchants.
Analyze the following revenue opportunity and store context, then generate a high-impact proposed merchant action.

OPPORTUNITY FACTS:
- Type: ${opportunity.type}
- Priority: ${opportunity.priority}
- Title: ${opportunity.title}
- Description: ${opportunity.description}
- Recommendation: ${opportunity.recommendation}
- Opportunity Data: ${JSON.stringify(opportunity.data, null, 2)}

COMMERCE CONTEXT:
${context ? JSON.stringify(context, null, 2) : "None provided"}

OUTPUT REQUIREMENTS:
Output ONLY a valid, raw JSON object (NO markdown backticks, NO markdown formatting, NO extra commentary) with the following structure:
{
  "action": "RESTOCK" | "DISCOUNT" | "BUNDLE" | "NO_ACTION",
  "title": "<Concise action title>",
  "reason": "<Detailed data-driven reasoning>",
  "quantity": <number | null> (required if action is RESTOCK),
  "discountPercent": <number | null> (between 1 and 100, required if action is DISCOUNT),
  "expectedImpact": "<Projected financial or operational outcome>",
  "confidence": <number between 0.0 and 1.0>,
  "targetVariantId": "<variantId if applicable>",
  "targetProductId": "<productId if applicable>",
  "bundleProductIds": ["<id1>", "<id2>"] (if action is BUNDLE)
}`;
}

export function generateDeterministicProposal(
  opportunity: RevenueOpportunity,
  context?: OpportunityContext
): AIProposal {
  switch (opportunity.type) {
    case "LOW_STOCK": {
      const quantity =
        typeof opportunity.data?.recommendedRestock === "number"
          ? opportunity.data.recommendedRestock
          : 10;

      return {
        action: "RESTOCK",
        title: `Restock ${opportunity.data?.product ?? "Inventory"} (${opportunity.data?.variant ?? "Variant"})`,
        reason: `Available stock (${opportunity.data?.availableStock ?? 0}) is critically low relative to recent sales (${opportunity.data?.recentSales ?? 0} units).`,
        quantity,
        expectedImpact: "Prevent stockouts, preserve customer satisfaction, and protect active revenue momentum.",
        confidence: 0.94,
        targetVariantId: String(opportunity.data?.variantId ?? ""),
        targetProductId: String(opportunity.data?.productId ?? ""),
      };
    }

    case "HIGH_DEMAND": {
      const sales = Number(opportunity.data?.sales ?? 10);
      return {
        action: "RESTOCK",
        title: `Increase Inventory Allocation: ${opportunity.data?.product ?? "High Velocity Item"}`,
        reason: `Item shows accelerated sales velocity with ${sales} units sold. Increasing stock allocation is necessary to support demand curve.`,
        quantity: Math.max(sales * 2, 20),
        expectedImpact: "Sustain sales velocity without stockout interruptions.",
        confidence: 0.91,
        targetVariantId: String(opportunity.data?.variantId ?? ""),
        targetProductId: String(opportunity.data?.productId ?? ""),
      };
    }

    case "CROSS_SELL": {
      const productIds = Array.isArray(opportunity.data?.productIds)
        ? (opportunity.data.productIds as string[])
        : [];
      const products = Array.isArray(opportunity.data?.products)
        ? (opportunity.data.products as string[]).join(" + ")
        : "Products";

      return {
        action: "BUNDLE",
        title: `Create Commercial Bundle: ${products}`,
        reason: `Identified high co-purchase correlation across ${opportunity.data?.occurrences ?? 2} paid transactions. Bundling increases average order value (AOV).`,
        discountPercent: 10,
        expectedImpact: "Increase Average Order Value (AOV) by approximately 15-20%.",
        confidence: 0.88,
        bundleProductIds: productIds,
      };
    }

    case "LOW_CONVERSION": {
      return {
        action: "DISCOUNT",
        title: `Run Promotional Launch: ${opportunity.data?.product ?? "Listing"}`,
        reason: `Product has recorded 0 conversions since creation. A targeted discount tests price elasticity and boosts initial purchase velocity.`,
        discountPercent: 15,
        expectedImpact: "Generate initial sales signals and validate customer demand.",
        confidence: 0.82,
        targetProductId: String(opportunity.data?.productId ?? ""),
      };
    }

    default:
      return {
        action: "NO_ACTION",
        title: "Maintain Current Baseline",
        reason: "Opportunity parameters are within standard tolerance limits.",
        expectedImpact: "No immediate operational change required.",
        confidence: 0.7,
      };
  }
}

export async function queryGroqForProposal(
  opportunity: RevenueOpportunity,
  context?: OpportunityContext,
  apiKey?: string,
  model?: string
): Promise<AIProposal> {
  const client = createGroqClient(apiKey);

  if (!client) {
    return generateDeterministicProposal(opportunity, context);
  }

  const prompt = buildOpportunityPrompt(opportunity, context);
  const modelsToTry = model ? [model, ...DEFAULT_MODELS] : DEFAULT_MODELS;

  for (const targetModel of modelsToTry) {
    try {
      const completion = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a structured AI agent that strictly returns valid JSON without markdown fences or additional text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: targetModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) continue;

      const parsed = JSON.parse(content);
      const validated = aiProposalSchema.safeParse(parsed);

      if (validated.success) {
        return validated.data;
      }
    } catch {
      continue;
    }
  }

  return generateDeterministicProposal(opportunity, context);
}
