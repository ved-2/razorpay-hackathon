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
