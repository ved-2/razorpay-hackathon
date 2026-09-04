"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayPaymentProvider = void 0;
const client_js_1 = require("./client.js");
const orders_js_1 = require("./orders.js");
const verify_js_1 = require("./verify.js");
const webhooks_js_1 = require("./webhooks.js");
class RazorpayPaymentProvider {
    name = "razorpay";
    client;
    config;
    constructor(config) {
        this.config = config;
        this.client = (0, client_js_1.createRazorpayClient)(config);
    }
    async createOrder(input) {
        return (0, orders_js_1.createRazorpayOrder)(this.client, input);
    }
    async verifyPayment(input) {
        return (0, verify_js_1.verifyRazorpayPaymentSignature)(input, this.config.keySecret);
    }
    verifyWebhook(payload, signature, secret) {
        const webhookSecret = secret ?? this.config.webhookSecret;
        if (!webhookSecret) {
            throw new Error("Razorpay webhook secret is not configured");
        }
        return (0, webhooks_js_1.verifyRazorpayWebhookSignature)(payload, signature, webhookSecret);
    }
}
exports.RazorpayPaymentProvider = RazorpayPaymentProvider;
