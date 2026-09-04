export type CommerceEventType = "order.created" | "order.paid" | "order.cancelled" | "payment.created" | "payment.verified" | "payment.failed" | "inventory.low" | "ai.proposal.created" | "approval.created" | "approval.approved" | "approval.rejected" | "action.executed";
export interface CommerceEvent<T = Record<string, unknown>> {
    id: string;
    type: CommerceEventType;
    merchantId: string;
    timestamp: string;
    payload: T;
}
export type EventHandler<T = Record<string, unknown>> = (event: CommerceEvent<T>) => Promise<void> | void;
export interface JobDefinition<T = Record<string, unknown>> {
    id: string;
    name: string;
    merchantId: string;
    data: T;
    enqueuedAt: string;
}
export type JobWorker<T = Record<string, unknown>> = (job: JobDefinition<T>) => Promise<void>;
