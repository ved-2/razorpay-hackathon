export interface RevenueOverview {
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  averageOrderValue: number;
  activeProducts: number;
  unitsSold: number;
  conversionRate: number;
}

export interface RevenueOverviewResponse {
  overview: RevenueOverview;
}

export type OpportunityType =
  | "LOW_STOCK"
  | "HIGH_DEMAND"
  | "CROSS_SELL"
  | "LOW_CONVERSION";

export type OpportunityPriority = "LOW" | "MEDIUM" | "HIGH";

export interface RevenueOpportunity {
  id: string;
  type: OpportunityType;
  priority: OpportunityPriority;
  title: string;
  description: string;
  recommendation: string;
  data: Record<string, unknown>;
}

export interface RevenueOpportunitiesResponse {
  opportunities: RevenueOpportunity[];
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

export interface RevenueAnalyticsResponse {
  analytics: RevenueAnalytics;
}
