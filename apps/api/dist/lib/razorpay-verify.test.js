"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const vitest_1 = require("vitest");
const razorpay_verify_1 = require("./razorpay-verify");
const env_1 = require("../config/env");
(0, vitest_1.describe)("verifyRazorpaySignature", () => {
    (0, vitest_1.it)("accepts a valid signature", () => {
        const payload = "test-payload";
        const signature = node_crypto_1.default
            .createHmac("sha256", env_1.env.RAZORPAY_KEY_SECRET)
            .update(payload)
            .digest("hex");
        (0, vitest_1.expect)((0, razorpay_verify_1.verifyRazorpaySignature)(payload, signature)).toBe(true);
    });
    (0, vitest_1.it)("rejects an invalid signature", () => {
        (0, vitest_1.expect)((0, razorpay_verify_1.verifyRazorpaySignature)("test-payload", "invalid-signature")).toBe(false);
    });
    (0, vitest_1.it)("rejects a modified payload", () => {
        const payload = "test-payload";
        const signature = node_crypto_1.default
            .createHmac("sha256", env_1.env.RAZORPAY_KEY_SECRET)
            .update(payload)
            .digest("hex");
        (0, vitest_1.expect)((0, razorpay_verify_1.verifyRazorpaySignature)("modified-payload", signature)).toBe(false);
    });
});
