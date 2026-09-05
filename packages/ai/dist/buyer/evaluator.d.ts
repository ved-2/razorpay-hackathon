import { BuyerEvaluationResult, BuyerPolicy, BuyerProductInput } from "./types.js";
export declare function evaluateBuyerDecision(product: BuyerProductInput, policy: BuyerPolicy, apiKey?: string): Promise<BuyerEvaluationResult>;
