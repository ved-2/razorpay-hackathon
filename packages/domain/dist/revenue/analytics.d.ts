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
export declare function getRevenueOverview(merchantId: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    paidOrders: number;
    averageOrderValue: number;
    activeProducts: number;
}>;
export declare function getRevenueAnalytics(merchantId: string): Promise<RevenueAnalytics>;
