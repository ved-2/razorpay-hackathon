export interface Inventory {
  id?: string;
  variantId: string;
  quantity: number;
  reserved: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  inventory?: Inventory | null;
}

export type ProductStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  status: ProductStatus;
  merchantId: string;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt?: string;
}

export interface ProductsResponse {
  products: Product[];
}

export interface ProductResponse {
  product: Product;
}

export interface VariantResponse {
  variant: ProductVariant;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
}

export interface CreateVariantPayload {
  name: string;
  sku: string;
  price: number;
  currency?: string;
  quantity?: number;
}
