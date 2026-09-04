import Razorpay from "razorpay";
import { CreateOrderInput, CreateOrderResult } from "../types.js";

export async function createRazorpayOrder(
  client: Razorpay,
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const response = await client.orders.create({
    amount: input.amount,
    currency: input.currency,
    receipt: input.receipt,
    notes: input.notes,
  });

  return {
    id: response.id,
    amount: Number(response.amount),
    currency: response.currency,
    status: response.status,
    receipt: response.receipt ?? undefined,
    raw: response,
  };
}
