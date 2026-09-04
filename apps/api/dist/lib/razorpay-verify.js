"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpaySignature = verifyRazorpaySignature;
const payments_1 = require("@commerceos/payments");
const env_1 = require("../config/env");
function verifyRazorpaySignature(payload, signature, secret = env_1.env.RAZORPAY_KEY_SECRET) {
    return (0, payments_1.verifyRazorpayWebhookSignature)(payload, signature, secret);
}
