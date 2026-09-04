import { PaymentProvider } from "../provider.js";
import { CreateOrderInput, CreateOrderResult, VerifyPaymentInput, PaymentResult, RazorpayConfig } from "../types.js";
export declare class RazorpayPaymentProvider implements PaymentProvider {
    readonly name = "razorpay";
    private client;
    private config;
    constructor(config: RazorpayConfig);
    createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
    verifyPayment(input: VerifyPaymentInput): Promise<PaymentResult>;
    verifyWebhook(payload: string, signature: string, secret?: string): boolean;
}
