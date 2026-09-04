import { z } from "zod";
export declare const aiActionEnum: z.ZodEnum<{
    BUNDLE: "BUNDLE";
    DISCOUNT: "DISCOUNT";
    NO_ACTION: "NO_ACTION";
    RESTOCK: "RESTOCK";
}>;
export type AIAction = z.infer<typeof aiActionEnum>;
export declare const aiProposalSchema: z.ZodObject<{
    action: z.ZodEnum<{
        BUNDLE: "BUNDLE";
        DISCOUNT: "DISCOUNT";
        NO_ACTION: "NO_ACTION";
        RESTOCK: "RESTOCK";
    }>;
    title: z.ZodString;
    reason: z.ZodString;
    quantity: z.ZodOptional<z.ZodNumber>;
    discountPercent: z.ZodOptional<z.ZodNumber>;
    expectedImpact: z.ZodString;
    confidence: z.ZodNumber;
    targetVariantId: z.ZodOptional<z.ZodString>;
    targetProductId: z.ZodOptional<z.ZodString>;
    bundleProductIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type AIProposal = z.infer<typeof aiProposalSchema>;
