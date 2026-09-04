import { CreateOrderInput, CreateOrderResult, VerifyPaymentInput, PaymentResult } from "./types.js";
export interface PaymentProvider {
    readonly name: string;
    createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
    verifyPayment(input: VerifyPaymentInput): Promise<PaymentResult>;
    verifyWebhook(payload: string, signature: string, secret?: string): boolean;
}
