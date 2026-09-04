import { RevenueOpportunity } from "./types.js";
export declare function detectLowStockOpportunities(merchantId: string, threshold?: number): Promise<RevenueOpportunity[]>;
export declare function detectHighDemandOpportunities(merchantId: string, threshold?: number): Promise<RevenueOpportunity[]>;
export declare function detectCrossSellOpportunities(merchantId: string, minOccurrence?: number): Promise<RevenueOpportunity[]>;
export declare function detectLowConversionOpportunities(merchantId: string): Promise<RevenueOpportunity[]>;
export declare function getRevenueOpportunities(merchantId: string, options?: {
    lowStockThreshold?: number;
    highDemandThreshold?: number;
    crossSellMinOccurrence?: number;
}): Promise<RevenueOpportunity[]>;
