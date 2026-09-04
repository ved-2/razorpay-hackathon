"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayPaymentSignature = verifyRazorpayPaymentSignature;
const node_crypto_1 = __importDefault(require("node:crypto"));
function verifyRazorpayPaymentSignature(input, keySecret) {
    const payload = `${input.orderId}|${input.paymentId}`;
    const expectedSignature = node_crypto_1.default
        .createHmac("sha256", keySecret)
        .update(payload)
        .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(input.signature, "utf8");
    if (expectedBuffer.length !== signatureBuffer.length) {
        return {
            verified: false,
            orderId: input.orderId,
            paymentId: input.paymentId,
            error: "Signature length mismatch",
        };
    }
    const isValid = node_crypto_1.default.timingSafeEqual(expectedBuffer, signatureBuffer);
    return {
        verified: isValid,
        orderId: input.orderId,
        paymentId: input.paymentId,
        error: isValid ? undefined : "Invalid signature",
    };
}
