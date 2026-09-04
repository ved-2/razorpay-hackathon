import { prisma } from "@commerceos/database";
import { getRevenueOverview } from "@commerceos/domain";

export async function getProduct(merchantId: string, productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      merchantId,
    },
    include: {
      variants: {
        include: {
          inventory: true,
        },
      },
    },
  });
}

export async function getInventory(merchantId: string, variantId: string) {
  return prisma.inventory.findFirst({
    where: {
      variantId,
      variant: {
        product: {
          merchantId,
        },
      },
    },
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function getSales(
  merchantId: string,
  variantId?: string,
  productId?: string
) {
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        merchantId,
        status: {
          in: ["PAID", "FULFILLED"],
        },
      },
      ...(variantId ? { variantId } : {}),
      ...(productId ? { variant: { productId } } : {}),
    },
    include: {
      order: {
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
  });

  const totalUnits = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const distinctOrderIds = new Set(orderItems.map((item) => item.order.id));

  return {
    totalUnits,
    totalRevenue,
    orderCount: distinctOrderIds.size,
  };
}

export async function getRevenue(merchantId: string) {
  return getRevenueOverview(merchantId);
}

export async function getOrders(merchantId: string, limit = 10) {
  return prisma.order.findMany({
    where: {
      merchantId,
    },
    include: {
      items: true,
      payments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function getProductCombinations(
  merchantId: string,
  productId: string
) {
  // Find all paid orders that included this product
  const relevantOrders = await prisma.order.findMany({
    where: {
      merchantId,
      status: {
        in: ["PAID", "FULFILLED"],
      },
      items: {
        some: {
          variant: {
            productId,
          },
        },
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

  const frequencyMap = new Map<string, { name: string; frequency: number }>();

  for (const order of relevantOrders) {
    for (const item of order.items) {
      const otherProdId = item.variant?.productId ?? item.variantId;
      if (otherProdId !== productId) {
        const entry = frequencyMap.get(otherProdId) ?? {
          name: item.productName,
          frequency: 0,
        };
        entry.frequency += 1;
        frequencyMap.set(otherProdId, entry);
      }
    }
  }

  return Array.from(frequencyMap.entries())
    .map(([pairedProductId, data]) => ({
      pairedProductId,
      pairedProductName: data.name,
      frequency: data.frequency,
    }))
    .sort((a, b) => b.frequency - a.frequency);
}
