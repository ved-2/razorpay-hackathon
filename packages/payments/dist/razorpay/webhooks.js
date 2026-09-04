"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayWebhookSignature = verifyRazorpayWebhookSignature;
const node_crypto_1 = __importDefault(require("node:crypto"));
function verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret) {
    const expectedSignature = node_crypto_1.default
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");
    if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
    }
    return node_crypto_1.default.timingSafeEqual(expectedBuffer, signatureBuffer);
}
