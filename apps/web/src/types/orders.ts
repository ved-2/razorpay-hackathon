export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELLED"
  | "FULFILLED";

export type PaymentStatus =
  | "CREATED"
  | "PROCESSING"
  | "VERIFICATION_PENDING"
  | "VERIFIED"
  | "FAILED";

export interface Customer {
  id: string;
  merchantId: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  merchantId: string;
  customerId: string;
  customer?: Customer;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  items: OrderItem[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  orders: Order[];
}

export interface OrderDetailResponse {
  order: Order;
  razorpayKeyId?: string;
}

