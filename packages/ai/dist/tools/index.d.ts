export declare function getProduct(merchantId: string, productId: string): Promise<({
    variants: ({
        inventory: {
            id: string;
            variantId: string;
            quantity: number;
            reserved: number;
            createdAt: Date;
            updatedAt: Date;
        } | null;
    } & {
        id: string;
        productId: string;
        sku: string;
        name: string;
        price: number;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
    })[];
} & {
    id: string;
    merchantId: string;
    name: string;
    description: string | null;
    status: import("@commerceos/database").$Enums.ProductStatus;
    createdAt: Date;
    updatedAt: Date;
}) | null>;
export declare function getInventory(merchantId: string, variantId: string): Promise<({
    variant: {
        product: {
            id: string;
            merchantId: string;
            name: string;
            description: string | null;
            status: import("@commerceos/database").$Enums.ProductStatus;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        productId: string;
        sku: string;
        name: string;
        price: number;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
    };
} & {
    id: string;
    variantId: string;
    quantity: number;
    reserved: number;
    createdAt: Date;
    updatedAt: Date;
}) | null>;
export declare function getSales(merchantId: string, variantId?: string, productId?: string): Promise<{
    totalUnits: number;
    totalRevenue: number;
    orderCount: number;
}>;
export declare function getRevenue(merchantId: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    paidOrders: number;
    averageOrderValue: number;
    activeProducts: number;
}>;
export declare function getOrders(merchantId: string, limit?: number): Promise<({
    items: {
        id: string;
        orderId: string;
        variantId: string;
        productName: string;
        variantName: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        createdAt: Date;
    }[];
    payments: {
        id: string;
        orderId: string;
        provider: string;
        providerOrderId: string | null;
        providerPaymentId: string | null;
        amount: number;
        currency: string;
        status: import("@commerceos/database").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
    }[];
} & {
    id: string;
    merchantId: string;
    customerId: string;
    status: import("@commerceos/database").$Enums.OrderStatus;
    currency: string;
    subtotal: number;
    discount: number;
    total: number;
    createdAt: Date;
    updatedAt: Date;
})[]>;
export declare function getProductCombinations(merchantId: string, productId: string): Promise<{
    pairedProductId: string;
    pairedProductName: string;
    frequency: number;
}[]>;
