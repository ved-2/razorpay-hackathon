export interface CreateOrderInput {
  amount: number;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
  raw?: unknown;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentResult {
  verified: boolean;
  orderId: string;
  paymentId: string;
  error?: string;
}

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}
