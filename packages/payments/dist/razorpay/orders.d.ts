import Razorpay from "razorpay";
import { CreateOrderInput, CreateOrderResult } from "../types.js";
export declare function createRazorpayOrder(client: Razorpay, input: CreateOrderInput): Promise<CreateOrderResult>;
