export type AuditAction =
  | "MERCHANT_CREATED"
  | "PRODUCT_CREATED"
  | "ORDER_CREATED"
  | "PAYMENT_CREATED"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_FAILED"
  | "WEBHOOK_RECEIVED"
  | "AI_PROPOSAL_CREATED"
  | "POLICY_CHECKED"
  | "APPROVAL_CREATED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED"
  | "ACTION_EXECUTED";

export type ActorType = "USER" | "AI_AGENT" | "WEBHOOK" | "SYSTEM";

export interface AuditEvent {
  id: string;
  merchantId: string;
  actorType: ActorType;
  actorId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditResponse {
  events: AuditEvent[];
}
