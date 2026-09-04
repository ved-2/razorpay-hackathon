"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRazorpayOrder = createRazorpayOrder;
async function createRazorpayOrder(client, input) {
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
