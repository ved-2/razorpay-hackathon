import { prisma } from "@commerceos/database";

export interface RevenueOverview {
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  averageOrderValue: number;
  activeProducts: number;
  unitsSold: number;
  conversionRate: number;
}

export interface RevenueByPeriod {
  period: string;
  revenue: number;
  orders: number;
}

export interface OrdersByDay {
  date: string;
  totalOrders: number;
  paidOrders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  revenue: number;
  unitsSold: number;
}

export interface TopVariant {
  variantId: string;
  sku: string;
  name: string;
  productName: string;
  revenue: number;
  unitsSold: number;
}

export interface RevenueAnalytics {
  overview: RevenueOverview;
  revenueByDay: RevenueByPeriod[];
  revenueByWeek: RevenueByPeriod[];
  revenueByMonth: RevenueByPeriod[];
  ordersByDay: OrdersByDay[];
  topProducts: TopProduct[];
  topVariants: TopVariant[];
}

function getWeekIdentifier(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function getRevenueOverview(merchantId: string) {
  const [orders, paidOrders, products] = await Promise.all([
    prisma.order.count({
      where: {
        merchantId,
      },
    }),

    prisma.order.findMany({
      where: {
        merchantId,
        status: {
          in: ["PAID", "FULFILLED"],
        },
      },
      select: {
        total: true,
      },
    }),

    prisma.product.count({
      where: {
        merchantId,
        status: "ACTIVE",
      },
    }),
  ]);

  const totalRevenue = paidOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  const paidOrderCount = paidOrders.length;

  const averageOrderValue =
    paidOrderCount > 0
      ? Math.round(totalRevenue / paidOrderCount)
      : 0;

  return {
    totalRevenue,
    totalOrders: orders,
    paidOrders: paidOrderCount,
    averageOrderValue,
    activeProducts: products,
  };
}

export async function getRevenueAnalytics(merchantId: string): Promise<RevenueAnalytics> {
  const [allOrders, paidOrders, activeProducts] = await Promise.all([
    prisma.order.findMany({
      where: {
        merchantId,
      },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.order.findMany({
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
      orderBy: {
        createdAt: "asc",
      },
    }),

    prisma.product.count({
      where: {
        merchantId,
        status: "ACTIVE",
      },
    }),
  ]);

  let totalRevenue = 0;
  let unitsSold = 0;

  const dayRevenueMap = new Map<string, { revenue: number; orders: number }>();
  const weekRevenueMap = new Map<string, { revenue: number; orders: number }>();
  const monthRevenueMap = new Map<string, { revenue: number; orders: number }>();

  const productMap = new Map<string, { name: string; revenue: number; unitsSold: number }>();
  const variantMap = new Map<string, { sku: string; name: string; productName: string; revenue: number; unitsSold: number }>();

  for (const order of paidOrders) {
    totalRevenue += order.total;

    const dayKey = order.createdAt.toISOString().slice(0, 10);
    const weekKey = getWeekIdentifier(order.createdAt);
    const monthKey = order.createdAt.toISOString().slice(0, 7);

    // Day aggregation
    const dayData = dayRevenueMap.get(dayKey) ?? { revenue: 0, orders: 0 };
    dayData.revenue += order.total;
    dayData.orders += 1;
    dayRevenueMap.set(dayKey, dayData);

    // Week aggregation
    const weekData = weekRevenueMap.get(weekKey) ?? { revenue: 0, orders: 0 };
    weekData.revenue += order.total;
    weekData.orders += 1;
    weekRevenueMap.set(weekKey, weekData);

    // Month aggregation
    const monthData = monthRevenueMap.get(monthKey) ?? { revenue: 0, orders: 0 };
    monthData.revenue += order.total;
    monthData.orders += 1;
    monthRevenueMap.set(monthKey, monthData);

    // Order items aggregation
    for (const item of order.items) {
      unitsSold += item.quantity;

      const productId = item.variant?.productId ?? item.variantId;
      const prodData = productMap.get(productId) ?? {
        name: item.productName,
        revenue: 0,
        unitsSold: 0,
      };
      prodData.revenue += item.totalPrice;
      prodData.unitsSold += item.quantity;
      productMap.set(productId, prodData);

      const varData = variantMap.get(item.variantId) ?? {
        sku: item.sku,
        name: item.variantName,
        productName: item.productName,
        revenue: 0,
        unitsSold: 0,
      };
      varData.revenue += item.totalPrice;
      varData.unitsSold += item.quantity;
      variantMap.set(item.variantId, varData);
    }
  }

  // All orders by day (including pending/cancelled)
  const ordersByDayMap = new Map<string, { totalOrders: number; paidOrders: number }>();
  for (const order of allOrders) {
    const dayKey = order.createdAt.toISOString().slice(0, 10);
    const dayEntry = ordersByDayMap.get(dayKey) ?? { totalOrders: 0, paidOrders: 0 };
    dayEntry.totalOrders += 1;
    if (order.status === "PAID" || order.status === "FULFILLED") {
      dayEntry.paidOrders += 1;
    }
    ordersByDayMap.set(dayKey, dayEntry);
  }

  const paidOrdersCount = paidOrders.length;
  const totalOrdersCount = allOrders.length;
  const averageOrderValue = paidOrdersCount > 0 ? Math.round(totalRevenue / paidOrdersCount) : 0;
  const conversionRate = totalOrdersCount > 0 ? Number(((paidOrdersCount / totalOrdersCount) * 100).toFixed(2)) : 0;

  const revenueByDay: RevenueByPeriod[] = Array.from(dayRevenueMap.entries()).map(([period, data]) => ({
    period,
    revenue: data.revenue,
    orders: data.orders,
  }));

  const revenueByWeek: RevenueByPeriod[] = Array.from(weekRevenueMap.entries()).map(([period, data]) => ({
    period,
    revenue: data.revenue,
    orders: data.orders,
  }));

  const revenueByMonth: RevenueByPeriod[] = Array.from(monthRevenueMap.entries()).map(([period, data]) => ({
    period,
    revenue: data.revenue,
    orders: data.orders,
  }));

  const ordersByDay: OrdersByDay[] = Array.from(ordersByDayMap.entries()).map(([date, data]) => ({
    date,
    totalOrders: data.totalOrders,
    paidOrders: data.paidOrders,
  }));

  const topProducts: TopProduct[] = Array.from(productMap.entries())
    .map(([productId, data]) => ({
      productId,
      name: data.name,
      revenue: data.revenue,
      unitsSold: data.unitsSold,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const topVariants: TopVariant[] = Array.from(variantMap.entries())
    .map(([variantId, data]) => ({
      variantId,
      sku: data.sku,
      name: data.name,
      productName: data.productName,
      revenue: data.revenue,
      unitsSold: data.unitsSold,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    overview: {
      totalRevenue,
      totalOrders: totalOrdersCount,
      paidOrders: paidOrdersCount,
      averageOrderValue,
      activeProducts,
      unitsSold,
      conversionRate,
    },
    revenueByDay,
    revenueByWeek,
    revenueByMonth,
    ordersByDay,
    topProducts,
    topVariants,
  };
}