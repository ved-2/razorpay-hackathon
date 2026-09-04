import Groq from "groq-sdk";
import { RevenueOpportunity } from "@commerceos/domain";
import { OpportunityContext } from "./state.js";
import { AIProposal } from "./schema.js";
export declare function createGroqClient(apiKey?: string): Groq | null;
export declare function buildOpportunityPrompt(opportunity: RevenueOpportunity, context?: OpportunityContext): string;
export declare function generateDeterministicProposal(opportunity: RevenueOpportunity, context?: OpportunityContext): AIProposal;
export declare function queryGroqForProposal(opportunity: RevenueOpportunity, context?: OpportunityContext, apiKey?: string, model?: string): Promise<AIProposal>;
