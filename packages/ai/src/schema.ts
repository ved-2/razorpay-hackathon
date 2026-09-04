import { z } from "zod";

export const aiActionEnum = z.enum([
  "RESTOCK",
  "DISCOUNT",
  "BUNDLE",
  "NO_ACTION",
]);

export type AIAction = z.infer<typeof aiActionEnum>;

export const aiProposalSchema = z.object({
  action: aiActionEnum,
  title: z.string().min(1),
  reason: z.string().min(1),
  quantity: z.number().int().positive().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  expectedImpact: z.string().min(1),
  confidence: z.number().min(0).max(1),
  targetVariantId: z.string().optional(),
  targetProductId: z.string().optional(),
  bundleProductIds: z.array(z.string()).optional(),
});

export type AIProposal = z.infer<typeof aiProposalSchema>;
