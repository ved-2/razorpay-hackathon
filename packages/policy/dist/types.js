"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MERCHANT_POLICY = void 0;
exports.DEFAULT_MERCHANT_POLICY = {
    maxDiscountPercent: 20,
    maxRestockQuantity: 50,
    maxOrderValue: 1000000,
    allowedCurrencies: ["INR"],
    approvalRequired: true,
    minConfidence: 0.75,
    allowedActions: ["RESTOCK", "DISCOUNT", "BUNDLE", "NO_ACTION"],
};
