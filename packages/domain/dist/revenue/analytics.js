"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRevenueOverview = getRevenueOverview;
exports.getRevenueAnalytics = getRevenueAnalytics;
const database_1 = require("@commerceos/database");
function getWeekIdentifier(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
async function getRevenueOverview(merchantId) {
    const [orders, paidOrders, products] = await Promise.all([
        database_1.prisma.order.count({
            where: {
                merchantId,
            },
        }),
        database_1.prisma.order.findMany({
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
        database_1.prisma.product.count({
            where: {
                merchantId,
                status: "ACTIVE",
            },
        }),
    ]);
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
    const paidOrderCount = paidOrders.length;
    const averageOrderValue = paidOrderCount > 0
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
async function getRevenueAnalytics(merchantId) {
    const [allOrders, paidOrders, activeProducts] = await Promise.all([
        database_1.prisma.order.findMany({
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
        database_1.prisma.order.findMany({
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
        database_1.prisma.product.count({
            where: {
                merchantId,
                status: "ACTIVE",
            },
        }),
    ]);
    let totalRevenue = 0;
    let unitsSold = 0;
    const dayRevenueMap = new Map();
    const weekRevenueMap = new Map();
    const monthRevenueMap = new Map();
    const productMap = new Map();
    const variantMap = new Map();
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
    const ordersByDayMap = new Map();
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
    const revenueByDay = Array.from(dayRevenueMap.entries()).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        orders: data.orders,
    }));
    const revenueByWeek = Array.from(weekRevenueMap.entries()).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        orders: data.orders,
    }));
    const revenueByMonth = Array.from(monthRevenueMap.entries()).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        orders: data.orders,
    }));
    const ordersByDay = Array.from(ordersByDayMap.entries()).map(([date, data]) => ({
        date,
        totalOrders: data.totalOrders,
        paidOrders: data.paidOrders,
    }));
    const topProducts = Array.from(productMap.entries())
        .map(([productId, data]) => ({
        productId,
        name: data.name,
        revenue: data.revenue,
        unitsSold: data.unitsSold,
    }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    const topVariants = Array.from(variantMap.entries())
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
