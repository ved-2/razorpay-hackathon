import { prisma } from "@commerceos/database";
import {
  OpportunityPriority,
  RevenueOpportunity,
} from "./types.js";

const PRIORITY_WEIGHTS: Record<OpportunityPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export async function detectLowStockOpportunities(
  merchantId: string,
  threshold = 5
): Promise<RevenueOpportunity[]> {
  const variants = await prisma.productVariant.findMany({
    where: {
      product: {
        merchantId,
        status: "ACTIVE",
      },
    },
    include: {
      product: true,
      inventory: true,
      orderItems: {
        where: {
          order: {
            merchantId,
            status: {
              in: ["PAID", "FULFILLED"],
            },
          },
        },
      },
    },
  });

  const opportunities: RevenueOpportunity[] = [];

  for (const variant of variants) {
    const quantity = variant.inventory?.quantity ?? 0;
    const reserved = variant.inventory?.reserved ?? 0;
    const availableStock = Math.max(0, quantity - reserved);

    const recentSales = variant.orderItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // Rule: available stock <= threshold AND has paid sales
    if (availableStock <= threshold && recentSales > 0) {
      const priority: OpportunityPriority = availableStock <= 2 ? "HIGH" : "MEDIUM";
      const recommendedRestock = Math.max(15 - availableStock, 5);

      opportunities.push({
        id: `opp_low_stock_${variant.id}`,
        type: "LOW_STOCK",
        priority,
        title: `Low Stock: ${variant.product.name} (${variant.name})`,
        description: `Variant ${variant.sku} has only ${availableStock} units available with ${recentSales} recent units sold.`,
        recommendation: `Restock ${recommendedRestock} units to prevent stockouts`,
        data: {
          productId: variant.productId,
          variantId: variant.id,
          product: variant.product.name,
          variant: variant.name,
          sku: variant.sku,
          currentStock: quantity,
          reservedStock: reserved,
          availableStock,
          recentSales,
          recommendedRestock,
        },
      });
    }
  }

  return opportunities;
}

export async function detectHighDemandOpportunities(
  merchantId: string,
  threshold = 5
): Promise<RevenueOpportunity[]> {
  const variants = await prisma.productVariant.findMany({
    where: {
      product: {
        merchantId,
        status: "ACTIVE",
      },
    },
    include: {
      product: true,
      inventory: true,
      orderItems: {
        where: {
          order: {
            merchantId,
            status: {
              in: ["PAID", "FULFILLED"],
            },
          },
        },
      },
    },
  });

  const opportunities: RevenueOpportunity[] = [];

  for (const variant of variants) {
    const sales = variant.orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const revenue = variant.orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Rule: sales >= threshold
    if (sales >= threshold) {
      const priority: OpportunityPriority = sales >= 10 ? "HIGH" : "MEDIUM";

      opportunities.push({
        id: `opp_high_demand_${variant.id}`,
        type: "HIGH_DEMAND",
        priority,
        title: `High Velocity Item: ${variant.product.name} (${variant.name})`,
        description: `Strong sales velocity detected with ${sales} units sold generating ₹${(revenue / 100).toFixed(2)}.`,
        recommendation: "Increase inventory allocation and feature on storefront",
        data: {
          productId: variant.productId,
          variantId: variant.id,
          product: variant.product.name,
          variant: variant.name,
          sku: variant.sku,
          sales,
          revenue,
          availableStock: Math.max(0, (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0)),
        },
      });
    }
  }

  return opportunities;
}

export async function detectCrossSellOpportunities(
  merchantId: string,
  minOccurrence = 2
): Promise<RevenueOpportunity[]> {
  const paidOrders = await prisma.order.findMany({
    where: {
      merchantId,
      status: {
        in: ["PAID", "FULFILLED"],
      },
    },
    include: {
      items: {
        include: {
          variant: {
            select: {
              productId: true,
            },
          },
        },
      },
    },
  });

  // Track product pair frequency in single orders
  const pairMap = new Map<string, {
    productA: { id: string; name: string };
    productB: { id: string; name: string };
    count: number;
  }>();

  for (const order of paidOrders) {
    // Unique products in this order
    const productMapInOrder = new Map<string, string>();
    for (const item of order.items) {
      const productId = item.variant?.productId ?? item.variantId;
      if (!productMapInOrder.has(productId)) {
        productMapInOrder.set(productId, item.productName);
      }
    }

    const distinctProducts = Array.from(productMapInOrder.entries());
    if (distinctProducts.length < 2) continue;

    for (let i = 0; i < distinctProducts.length; i++) {
      for (let j = i + 1; j < distinctProducts.length; j++) {
        const [idA, nameA] = distinctProducts[i];
        const [idB, nameB] = distinctProducts[j];

        // Sort canonical key to prevent A-B vs B-A
        const [p1, p2] = idA < idB
          ? [{ id: idA, name: nameA }, { id: idB, name: nameB }]
          : [{ id: idB, name: nameB }, { id: idA, name: nameA }];

        const pairKey = `${p1.id}:::${p2.id}`;
        const existing = pairMap.get(pairKey) ?? {
          productA: p1,
          productB: p2,
          count: 0,
        };
        existing.count += 1;
        pairMap.set(pairKey, existing);
      }
    }
  }

  const opportunities: RevenueOpportunity[] = [];

  for (const [, pair] of pairMap.entries()) {
    if (pair.count >= minOccurrence) {
      const priority: OpportunityPriority = pair.count >= 4 ? "HIGH" : "MEDIUM";

      opportunities.push({
        id: `opp_cross_sell_${pair.productA.id}_${pair.productB.id}`,
        type: "CROSS_SELL",
        priority,
        title: `Bundle Opportunity: ${pair.productA.name} + ${pair.productB.name}`,
        description: `Customers frequently purchased ${pair.productA.name} and ${pair.productB.name} together across ${pair.count} orders.`,
        recommendation: `Create a discounted ${pair.productA.name} + ${pair.productB.name} bundle`,
        data: {
          productIds: [pair.productA.id, pair.productB.id],
          products: [pair.productA.name, pair.productB.name],
          occurrences: pair.count,
        },
      });
    }
  }

  return opportunities;
}

export async function detectLowConversionOpportunities(
  merchantId: string
): Promise<RevenueOpportunity[]> {
  const products = await prisma.product.findMany({
    where: {
      merchantId,
      status: "ACTIVE",
    },
    include: {
      variants: {
        include: {
          orderItems: {
            where: {
              order: {
                merchantId,
                status: {
                  in: ["PAID", "FULFILLED"],
                },
              },
            },
          },
        },
      },
    },
  });

  const opportunities: RevenueOpportunity[] = [];

  for (const product of products) {
    const totalPaidSales = product.variants.reduce(
      (sum, v) =>
        sum +
        v.orderItems.reduce((iSum, item) => iSum + item.quantity, 0),
      0
    );

    // Rule: active product with zero paid sales
    if (totalPaidSales === 0) {
      opportunities.push({
        id: `opp_low_conv_${product.id}`,
        type: "LOW_CONVERSION",
        priority: "LOW",
        title: `Zero Conversion: ${product.name}`,
        description: `Product "${product.name}" has 0 paid sales since listing.`,
        recommendation: "Consider improving product positioning, imagery, or running a promotional discount",
        data: {
          productId: product.id,
          product: product.name,
          paidSales: 0,
          variantsCount: product.variants.length,
          createdAt: product.createdAt.toISOString(),
        },
      });
    }
  }

  return opportunities;
}

export async function getRevenueOpportunities(
  merchantId: string,
  options?: {
    lowStockThreshold?: number;
    highDemandThreshold?: number;
    crossSellMinOccurrence?: number;
  }
): Promise<RevenueOpportunity[]> {
  const [lowStock, highDemand, crossSell, lowConversion] =
    await Promise.all([
      detectLowStockOpportunities(merchantId, options?.lowStockThreshold),
      detectHighDemandOpportunities(merchantId, options?.highDemandThreshold),
      detectCrossSellOpportunities(merchantId, options?.crossSellMinOccurrence),
      detectLowConversionOpportunities(merchantId),
    ]);

  const allOpportunities = [
    ...lowStock,
    ...highDemand,
    ...crossSell,
    ...lowConversion,
  ];

  // Sort by priority (HIGH -> MEDIUM -> LOW)
  return allOpportunities.sort(
    (a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
  );
}
