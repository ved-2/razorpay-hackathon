"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProposalSchema = exports.aiActionEnum = void 0;
const zod_1 = require("zod");
exports.aiActionEnum = zod_1.z.enum([
    "RESTOCK",
    "DISCOUNT",
    "BUNDLE",
    "NO_ACTION",
]);
exports.aiProposalSchema = zod_1.z.object({
    action: exports.aiActionEnum,
    title: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().positive().optional(),
    discountPercent: zod_1.z.number().min(0).max(100).optional(),
    expectedImpact: zod_1.z.string().min(1),
    confidence: zod_1.z.number().min(0).max(1),
    targetVariantId: zod_1.z.string().optional(),
    targetProductId: zod_1.z.string().optional(),
    bundleProductIds: zod_1.z.array(zod_1.z.string()).optional(),
});
