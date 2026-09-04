"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProduct = getProduct;
exports.getInventory = getInventory;
exports.getSales = getSales;
exports.getRevenue = getRevenue;
exports.getOrders = getOrders;
exports.getProductCombinations = getProductCombinations;
const database_1 = require("@commerceos/database");
const domain_1 = require("@commerceos/domain");
async function getProduct(merchantId, productId) {
    return database_1.prisma.product.findFirst({
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
async function getInventory(merchantId, variantId) {
    return database_1.prisma.inventory.findFirst({
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
async function getSales(merchantId, variantId, productId) {
    const orderItems = await database_1.prisma.orderItem.findMany({
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
async function getRevenue(merchantId) {
    return (0, domain_1.getRevenueOverview)(merchantId);
}
async function getOrders(merchantId, limit = 10) {
    return database_1.prisma.order.findMany({
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
async function getProductCombinations(merchantId, productId) {
    // Find all paid orders that included this product
    const relevantOrders = await database_1.prisma.order.findMany({
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
    const frequencyMap = new Map();
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
