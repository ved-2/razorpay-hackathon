import { AgentStateType, OpportunityContext } from "./state.js";
export declare function createOpportunityAgent(): import("@langchain/langgraph").CompiledStateGraph<import("@langchain/langgraph").StateType<{
    opportunity: import("@langchain/langgraph").BinaryOperatorAggregate<import("@commerceos/domain").RevenueOpportunity, import("@commerceos/domain").RevenueOpportunity>;
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
}>, import("@langchain/langgraph").UpdateType<{
    opportunity: import("@langchain/langgraph").BinaryOperatorAggregate<import("@commerceos/domain").RevenueOpportunity, import("@commerceos/domain").RevenueOpportunity>;
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
}>, "__start__" | "contextGathering" | "reasoning" | "validation", {
    opportunity: import("@langchain/langgraph").BinaryOperatorAggregate<import("@commerceos/domain").RevenueOpportunity, import("@commerceos/domain").RevenueOpportunity>;
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
}, {
    opportunity: import("@langchain/langgraph").BinaryOperatorAggregate<import("@commerceos/domain").RevenueOpportunity, import("@commerceos/domain").RevenueOpportunity>;
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
}, import("@langchain/langgraph").StateDefinition>;
export declare function runOpportunityAgent(opportunity: AgentStateType["opportunity"], merchantId: string): Promise<{
    opportunity: import("@commerceos/domain").RevenueOpportunity;
    context: OpportunityContext | undefined;
    proposal: {
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
    } | undefined;
    errors: string[];
}>;
