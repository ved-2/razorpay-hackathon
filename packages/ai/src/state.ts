import { Annotation } from "@langchain/langgraph";
import { RevenueOpportunity } from "@commerceos/domain";
import { AIProposal } from "./schema.js";

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
    inventory: { quantity: number; reserved: number } | null;
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

export const AgentStateAnnotation = Annotation.Root({
  opportunity: Annotation<RevenueOpportunity>({
    reducer: (_, next) => next,
  }),
  merchantId: Annotation<string>({
    reducer: (_, next) => next,
  }),
  context: Annotation<OpportunityContext | undefined>({
    reducer: (_, next) => next,
  }),
  rawResponse: Annotation<string | undefined>({
    reducer: (_, next) => next,
  }),
  proposal: Annotation<AIProposal | undefined>({
    reducer: (_, next) => next,
  }),
  errors: Annotation<string[]>({
    reducer: (curr = [], next = []) => [...curr, ...next],
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentStateAnnotation.State;
