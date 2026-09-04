import { AIProposal } from "@commerceos/ai";
import { MerchantPolicy, PolicyEvaluationResult } from "./types.js";
export declare function evaluateProposalPolicy(proposal: AIProposal, policyOverrides?: Partial<MerchantPolicy>): PolicyEvaluationResult;
