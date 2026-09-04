"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRazorpayClient = createRazorpayClient;
const razorpay_1 = __importDefault(require("razorpay"));
function createRazorpayClient(config) {
    return new razorpay_1.default({
        key_id: config.keyId,
        key_secret: config.keySecret,
    });
}
