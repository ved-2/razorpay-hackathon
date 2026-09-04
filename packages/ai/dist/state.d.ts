import { RevenueOpportunity } from "@commerceos/domain";
export interface OpportunityContext {
    product?: {
        id: string;
        name: string;
        description: string | null;
        status: string;
    } | null;
    variants?: Array<{
        id: string;
        sku: string;
        name: string;
        price: number;
        inventory: {
            quantity: number;
            reserved: number;
        } | null;
    }>;
    salesSummary?: {
        totalUnits: number;
        totalRevenue: number;
        orderCount: number;
    };
    productCombinations?: Array<{
        pairedProductId: string;
        pairedProductName: string;
        frequency: number;
    }>;
    storeOverview?: {
        totalRevenue: number;
        totalOrders: number;
        activeProducts: number;
    };
}
export declare const AgentStateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    opportunity: import("@langchain/langgraph").BinaryOperatorAggregate<RevenueOpportunity, RevenueOpportunity>;
    merchantId: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    context: import("@langchain/langgraph").BinaryOperatorAggregate<OpportunityContext | undefined, OpportunityContext | undefined>;
    rawResponse: import("@langchain/langgraph").BinaryOperatorAggregate<string | undefined, string | undefined>;
    proposal: import("@langchain/langgraph").BinaryOperatorAggregate<{
        action: "BUNDLE" | "DISCOUNT" | "NO_ACTION" | "RESTOCK";
        title: string;
        reason: string;
        quantity?: number | undefined;
        discountPercent?: number | undefined;
        expectedImpact: string;
        confidence: number;
        targetVariantId?: string | undefined;
        targetProductId?: string | undefined;
        bundleProductIds?: string[] | undefined;
    } | undefined, {
        action: "BUNDLE" | "DISCOUNT" | "NO_ACTION" | "RESTOCK";
        title: string;
        reason: string;
        quantity?: number | undefined;
        discountPercent?: number | undefined;
        expectedImpact: string;
        confidence: number;
        targetVariantId?: string | undefined;
        targetProductId?: string | undefined;
        bundleProductIds?: string[] | undefined;
    } | undefined>;
    errors: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
}>;
export type AgentStateType = typeof AgentStateAnnotation.State;
