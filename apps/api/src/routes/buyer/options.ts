import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@commerceos/database";
import { createGroqClient } from "@commerceos/ai";

const buyerOptionsSchema = z.object({
  voiceCommand: z.string().optional(),
  maxPrice: z.number().int().positive().optional(),
  keyword: z.string().optional(),
  inStockOnly: z.boolean().default(true),
});

export async function buyerOptionsRoute(app: FastifyInstance) {
  // Handles retrieving and ranking in-stock product options under user-specified conditions
  app.post("/buyer/options", async (request, reply) => {
    const body = buyerOptionsSchema.parse(request.body || {});
    const voiceCommand = (body.voiceCommand || "").trim();

    // Defined category keyword dictionaries for store catalog
    const categoryDefinitions: Record<string, { label: string; keywords: string[] }> = {
      shoes: {
        label: "Running Shoes",
        keywords: ["shoe", "shoes", "runner", "runners", "running", "sneaker", "sneakers", "carbon"],
      },
      socks: {
        label: "Performance Socks",
        keywords: ["sock", "socks", "aerodry"],
      },
      bottles: {
        label: "Hydration Flasks",
        keywords: ["bottle", "bottles", "water", "flask", "hydrovelocity"],
      },
      tights: {
        label: "Compression Tights",
        keywords: ["tight", "tights", "compression", "recovery", "thermal"],
      },
    };

    // Helper: extract budget in paise from a text snippet
    const extractBudget = (text: string): number | undefined => {
      const budgetMatch = text.match(
        /(?:under|below|less than|max|budget|within)\s*(?:₹|Rs\.?|INR)?\s*(\d+[\d,]*)/i
      );
      if (budgetMatch && budgetMatch[1]) {
        const rawNum = budgetMatch[1].replace(/,/g, "");
        return parseInt(rawNum, 10) * 100;
      }
      return undefined;
    };

    // 1. Segment voice command into sub-intents if multiple items are requested
    // e.g. "shoes under 4000 and socks under 1000", "runner below 3500 + socks under 600"
    interface SubIntent {
      key: string;
      label: string;
      keywords: string[];
      maxPricePaise?: number;
    }

    const subIntents: SubIntent[] = [];
    const segments = voiceCommand
      ? voiceCommand.split(/\s*(?:and|\+|\balso\b|,|&)\s*/i).filter((s) => s.trim().length > 0)
      : [];

    if (segments.length > 1) {
      for (const seg of segments) {
        const segLower = seg.toLowerCase();
        const segBudget = extractBudget(seg);

        // Find which category matches this segment
        let matchedCat = "general";
        let catLabel = "Matching Items";
        let catKeywords: string[] = [];

        for (const [catKey, catDef] of Object.entries(categoryDefinitions)) {
          if (catDef.keywords.some((kw) => segLower.includes(kw))) {
            matchedCat = catKey;
            catLabel = catDef.label;
            catKeywords = catDef.keywords;
            break;
          }
        }

        const labelWithBudget = segBudget
          ? `${catLabel} (under ₹${(segBudget / 100).toLocaleString("en-IN")})`
          : catLabel;

        subIntents.push({
          key: matchedCat,
          label: labelWithBudget,
          keywords: catKeywords,
          maxPricePaise: segBudget,
        });
      }
    } else {
      // Single intent or global command
      const globalBudget = body.maxPrice || extractBudget(voiceCommand);
      const lowerCmd = voiceCommand.toLowerCase();

      // Check if multiple categories were mentioned without 'and'
      const matchedCats: string[] = [];
      for (const [catKey, catDef] of Object.entries(categoryDefinitions)) {
        if (catDef.keywords.some((kw) => lowerCmd.includes(kw))) {
          matchedCats.push(catKey);
        }
      }

      if (matchedCats.length > 1) {
        for (const catKey of matchedCats) {
          const catDef = categoryDefinitions[catKey];
          subIntents.push({
            key: catKey,
            label: globalBudget
              ? `${catDef.label} (under ₹${(globalBudget / 100).toLocaleString("en-IN")})`
              : catDef.label,
            keywords: catDef.keywords,
            maxPricePaise: globalBudget,
          });
        }
      } else if (matchedCats.length === 1) {
        const catKey = matchedCats[0];
        const catDef = categoryDefinitions[catKey];
        subIntents.push({
          key: catKey,
          label: globalBudget
            ? `${catDef.label} (under ₹${(globalBudget / 100).toLocaleString("en-IN")})`
            : catDef.label,
          keywords: catDef.keywords,
          maxPricePaise: globalBudget,
        });
      } else {
        subIntents.push({
          key: "all",
          label: globalBudget
            ? `In-Stock Products (under ₹${(globalBudget / 100).toLocaleString("en-IN")})`
            : "In-Stock Products",
          keywords: [],
          maxPricePaise: globalBudget,
        });
      }
    }

    // 2. Query all active variants with inventory for the merchant
    const allVariants = await prisma.productVariant.findMany({
      where: {
        product: {
          status: "ACTIVE",
          merchantId: "demo-merchant-apex",
        },
      },
      include: {
        product: true,
        inventory: true,
      },
      orderBy: {
        price: "asc",
      },
    });

    // 3. Filter variants with strictly positive stock
    const availableVariants = allVariants.filter((v) => {
      const avail = (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0);
      return avail > 0;
    });

    // 4. Map and bucket variants for each sub-intent
    interface FormattedOption {
      variantId: string;
      productId: string;
      productName: string;
      variantName: string;
      fullName: string;
      sku: string;
      price: number;
      currency: string;
      availableStock: number;
      inStock: boolean;
      description: string | null;
      category: string;
      intentGroup: string;
      matchReason: string;
    }

    const formattedOptions: FormattedOption[] = [];
    const recommendedVariants: FormattedOption[] = [];

    for (const intent of subIntents) {
      // Filter candidates for this intent
      const candidates = availableVariants.filter((v) => {
        if (intent.maxPricePaise && v.price > intent.maxPricePaise) {
          return false;
        }
        if (intent.keywords.length > 0) {
          const text = `${v.product.name} ${v.name} ${v.product.description}`.toLowerCase();
          return intent.keywords.some((kw) => text.includes(kw));
        }
        return true;
      });

      // Rank by price or relevancy
      candidates.sort((a, b) => a.price - b.price);

      if (candidates.length > 0) {
        candidates.forEach((v, idx) => {
          const availableStock =
            (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0);
          const optionObj: FormattedOption = {
            variantId: v.id,
            productId: v.productId,
            productName: v.product.name,
            variantName: v.name,
            fullName: `${v.product.name} (${v.name})`,
            sku: v.sku,
            price: v.price,
            currency: v.currency || "INR",
            availableStock,
            inStock: availableStock > 0,
            description: v.product.description,
            category: intent.key,
            intentGroup: intent.label,
            matchReason: `₹${(v.price / 100).toFixed(0)} • ${availableStock} in stock (${intent.label})`,
          };

          // Avoid duplicate entries if already added
          if (!formattedOptions.some((o) => o.variantId === v.id)) {
            formattedOptions.push(optionObj);
          }

          // Top pick for this intent category
          if (idx === 0 && !recommendedVariants.some((r) => r.variantId === v.id)) {
            recommendedVariants.push(optionObj);
          }
        });
      }
    }

    // Fallback: if no specific sub-intent candidates matched, show lowest price in-stock items
    if (formattedOptions.length === 0) {
      availableVariants.slice(0, 5).forEach((v, idx) => {
        const availableStock =
          (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0);
        const optionObj: FormattedOption = {
          variantId: v.id,
          productId: v.productId,
          productName: v.product.name,
          variantName: v.name,
          fullName: `${v.product.name} (${v.name})`,
          sku: v.sku,
          price: v.price,
          currency: v.currency || "INR",
          availableStock,
          inStock: availableStock > 0,
          description: v.product.description,
          category: "general",
          intentGroup: "Available In Stock",
          matchReason: `₹${(v.price / 100).toFixed(0)} • ${availableStock} in stock`,
        };
        formattedOptions.push(optionObj);
        if (idx === 0) recommendedVariants.push(optionObj);
      });
    }

    // 5. Calculate combined basket total of top recommendations
    const combinedTotalPaise = recommendedVariants.reduce((sum, item) => sum + item.price, 0);

    // 6. Generate AI Summary
    let aiSummary = "";
    if (recommendedVariants.length > 1) {
      const itemsSummary = recommendedVariants
        .map((r) => `${r.productName} (₹${(r.price / 100).toFixed(0)})`)
        .join(" + ");
      aiSummary = `Multi-item match identified: ${itemsSummary} = Total ₹${(
        combinedTotalPaise / 100
      ).toLocaleString("en-IN")}. All items in stock and ready to order.`;
    } else if (recommendedVariants.length === 1) {
      aiSummary = `Identified best in-stock option: ${
        recommendedVariants[0].fullName
      } for ₹${(recommendedVariants[0].price / 100).toFixed(0)} (${
        recommendedVariants[0].availableStock
      } in stock).`;
    } else {
      aiSummary = `Found ${formattedOptions.length} in-stock options ready for cart selection.`;
    }

    // Attempt Groq LLM refinement if key is available
    const groq = createGroqClient();
    if (voiceCommand && recommendedVariants.length > 0 && groq) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content:
                "You are CommerceOS AI Buyer. In 1 concise sentence, explain how the recommended in-stock items satisfy the user's multi-criteria voice request and state the combined total.",
            },
            {
              role: "user",
              content: `User query: "${voiceCommand}". Recommended items: ${recommendedVariants
                .map((r) => `${r.fullName} at ₹${(r.price / 100).toFixed(0)}`)
                .join(", ")}. Combined Total: ₹${(combinedTotalPaise / 100).toFixed(0)}.`,
            },
          ],
          max_tokens: 100,
        });

        const text = completion.choices[0]?.message?.content;
        if (text) {
          aiSummary = text.trim();
        }
      } catch {
        // Keep fallback summary
      }
    }

    return reply.send({
      success: true,
      condition: voiceCommand,
      intents: subIntents,
      count: formattedOptions.length,
      options: formattedOptions,
      recommendedVariants: recommendedVariants,
      recommendedVariantIds: recommendedVariants.map((r) => r.variantId),
      combinedTotalPaise,
      aiSummary: aiSummary.trim(),
    });
  });

  // GET version for quick polling/listing of all in-stock products
  app.get("/buyer/options", async (_request, reply) => {
    const variants = await prisma.productVariant.findMany({
      where: {
        product: {
          status: "ACTIVE",
          merchantId: "demo-merchant-apex",
        },
      },
      include: {
        product: true,
        inventory: true,
      },
      orderBy: {
        price: "asc",
      },
    });

    const inStock = variants
      .map((v) => {
        const availableStock =
          (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0);
        return {
          variantId: v.id,
          productId: v.productId,
          productName: v.product.name,
          variantName: v.name,
          fullName: `${v.product.name} (${v.name})`,
          sku: v.sku,
          price: v.price,
          currency: v.currency || "INR",
          availableStock,
          inStock: availableStock > 0,
          description: v.product.description,
        };
      })
      .filter((v) => v.inStock);

    return reply.send({
      success: true,
      options: inStock,
      count: inStock.length,
    });
  });
}
