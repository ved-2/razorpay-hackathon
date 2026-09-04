import Razorpay from "razorpay";
import { PaymentProvider } from "../provider.js";
import {
  CreateOrderInput,
  CreateOrderResult,
  VerifyPaymentInput,
  PaymentResult,
  RazorpayConfig,
} from "../types.js";
import { createRazorpayClient } from "./client.js";
import { createRazorpayOrder } from "./orders.js";
import { verifyRazorpayPaymentSignature } from "./verify.js";
import { verifyRazorpayWebhookSignature } from "./webhooks.js";

export class RazorpayPaymentProvider implements PaymentProvider {
  public readonly name = "razorpay";
  private client: Razorpay;
  private config: RazorpayConfig;

  constructor(config: RazorpayConfig) {
    this.config = config;
    this.client = createRazorpayClient(config);
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    return createRazorpayOrder(this.client, input);
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentResult> {
    return verifyRazorpayPaymentSignature(input, this.config.keySecret);
  }

  verifyWebhook(payload: string, signature: string, secret?: string): boolean {
    const webhookSecret = secret ?? this.config.webhookSecret;
    if (!webhookSecret) {
      throw new Error("Razorpay webhook secret is not configured");
    }
    return verifyRazorpayWebhookSignature(payload, signature, webhookSecret);
  }
}
