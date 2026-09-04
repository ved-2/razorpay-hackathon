"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpay = exports.paymentProvider = void 0;
const payments_1 = require("@commerceos/payments");
const env_1 = require("../config/env");
exports.paymentProvider = new payments_1.RazorpayPaymentProvider({
    keyId: env_1.env.RAZORPAY_KEY_ID,
    keySecret: env_1.env.RAZORPAY_KEY_SECRET,
    webhookSecret: env_1.env.RAZORPAY_WEBHOOK_SECRET,
});
exports.razorpay = (0, payments_1.createRazorpayClient)({
    keyId: env_1.env.RAZORPAY_KEY_ID,
    keySecret: env_1.env.RAZORPAY_KEY_SECRET,
});
