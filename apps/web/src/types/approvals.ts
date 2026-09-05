import { AIProposal, ProposalAction } from "./ai";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ExecutionResult {
  action: string;
  executedAt: string;
  details: Record<string, unknown>;
}

export interface Approval {
  id: string;
  merchantId: string;
  type: ProposalAction | string;
  status: ApprovalStatus;
  title: string;
  reason: string;
  proposal: AIProposal;
  opportunityId?: string | null;
  executedAt?: string | null;
  executionResult?: ExecutionResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalsResponse {
  approvals: Approval[];
}

export interface ApprovalDetailResponse {
  approval: Approval;
}

export interface ApproveActionResponse {
  success: boolean;
  approval: Approval;
  executionResult: ExecutionResult;
}

export interface RejectActionResponse {
  success: boolean;
  approval: Approval;
}
