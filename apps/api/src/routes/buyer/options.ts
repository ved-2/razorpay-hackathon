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
    const voiceCommand = body.voiceCommand || "";

    // 1. Extract budget cap if mentioned in voice command (e.g., "under 4000", "below 2500")
    let budgetPaise = body.maxPrice;
    if (!budgetPaise && voiceCommand) {
      const budgetMatch = voiceCommand.match(
        /(?:under|below|less than|max|budget)\s*(?:₹|Rs\.?|INR)?\s*(\d+[\d,]*)/i
      );
      if (budgetMatch && budgetMatch[1]) {
        const rawNum = budgetMatch[1].replace(/,/g, "");
        budgetPaise = parseInt(rawNum, 10) * 100;
      }
    }

    // 2. Extract potential keywords (e.g., shoe, runner, sock, bottle, tight)
    const lowerCmd = voiceCommand.toLowerCase();
    const allKeywords = [
      "shoe",
      "runner",
      "running",
      "sneaker",
      "sock",
      "socks",
      "bottle",
      "water",
      "flask",
      "tight",
      "tights",
      "compression",
      "carbon",
      "recovery",
    ];
    const matchedKeywords = allKeywords.filter((kw) => lowerCmd.includes(kw));

    // 3. Query variants from database
    const variants = await prisma.productVariant.findMany({
      where: {
        product: {
          status: "ACTIVE",
          merchantId: "demo-merchant-apex",
        },
        ...(budgetPaise ? { price: { lte: budgetPaise } } : {}),
      },
      include: {
        product: true,
        inventory: true,
      },
      orderBy: {
        price: "asc",
      },
      take: 20,
    });

    // 4. Filter only variants with strictly positive available inventory
    const inStockVariants = variants.filter((v) => {
      const avail = (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0);
      return avail > 0;
    });

    // 5. Rank: if keywords match, score and prioritize relevant items first
    const ranked = [...inStockVariants].sort((a, b) => {
      if (matchedKeywords.length > 0) {
        const aText = `${a.product.name} ${a.name} ${a.product.description}`.toLowerCase();
        const bText = `${b.product.name} ${b.name} ${b.product.description}`.toLowerCase();
        let aScore = 0;
        let bScore = 0;
        for (const kw of matchedKeywords) {
          if (aText.includes(kw)) aScore += 10;
          if (bText.includes(kw)) bScore += 10;
        }
        if (aScore !== bScore) return bScore - aScore;
      }
      return a.price - b.price;
    });

    // 6. Format options for buyer UI
    const formattedOptions = ranked.map((v) => {
      const availableStock =
        (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0);
      const isWithinBudget = !budgetPaise || v.price <= budgetPaise;

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
        matchReason: `₹${(v.price / 100).toFixed(0)} • ${availableStock} in stock${
          isWithinBudget ? " (Within your budget)" : ""
        }`,
      };
    });

    // 7. Optional AI summary of recommendations
    let aiSummary = `Found ${formattedOptions.length} in-stock options matching your criteria.`;
    const topPick = formattedOptions[0] || null;

    const groq = createGroqClient();
    if (topPick && voiceCommand && groq) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content:
                "You are CommerceOS AI Buyer. In 1 concise sentence, explain why the product satisfies the user's condition and is ready for checkout.",
            },
            {
              role: "user",
              content: `User condition: "${voiceCommand}". Best matching in-stock product: "${topPick.fullName}", Price: ₹${(topPick.price / 100).toFixed(0)}, Available in stock: ${topPick.availableStock}.`,
            },
          ],
          max_tokens: 100,
        });

        const text = completion.choices[0]?.message?.content;
        if (text) {
          aiSummary = text.trim();
        }
      } catch {
        aiSummary = `Recommended: "${topPick.fullName}" for ₹${(topPick.price / 100).toFixed(0)} — verified in stock (${topPick.availableStock} available).`;
      }
    }

    return reply.send({
      success: true,
      condition: voiceCommand,
      maxBudgetPaise: budgetPaise,
      count: formattedOptions.length,
      options: formattedOptions,
      recommendedVariantId: topPick?.variantId || null,
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
