import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@commerceos/database";
import { aiProposalSchema } from "@commerceos/ai";
import { evaluateProposalPolicy } from "@commerceos/policy";
import { recordAuditEvent } from "../../services/audit";
import { authenticate } from "../../plugins/authenticate";

const createApprovalSchema = z.object({
  proposal: aiProposalSchema,
  opportunityId: z.string().optional(),
  policyOverrides: z
    .object({
      maxDiscountPercent: z.number().min(0).max(100).optional(),
      maxRestockQuantity: z.number().int().positive().optional(),
      maxOrderValue: z.number().int().positive().optional(),
      minConfidence: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export async function createApprovalRoute(app: FastifyInstance) {
  app.post(
    "/approvals",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = createApprovalSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid approval request",
          details: parsed.error.flatten(),
        });
      }

      const { merchantId } = request.user;
      const { proposal, opportunityId, policyOverrides } = parsed.data;

      // 1. Policy Gate Check
      const evaluation = evaluateProposalPolicy(proposal, policyOverrides);

      await recordAuditEvent({
        merchantId,
        actorType: "SYSTEM",
        action: "POLICY_CHECKED",
        entity: "AIProposal",
        metadata: {
          action: proposal.action,
          allowed: evaluation.allowed,
          violations: evaluation.violations,
        },
      });

      if (!evaluation.allowed) {
        return reply.status(400).send({
          error: "Proposal blocked by policy engine",
          violations: evaluation.violations,
          evaluation,
        });
      }

      // 2. Create Pending Approval
      const approval = await prisma.approval.create({
        data: {
          merchantId,
          type: proposal.action,
          status: "PENDING",
          title: proposal.title,
          reason: proposal.reason,
          proposal: proposal as any,
          opportunityId: opportunityId || null,
        },
      });

      await recordAuditEvent({
        merchantId,
        actorType: "USER",
        actorId: request.user.userId,
        action: "APPROVAL_CREATED",
        entity: "Approval",
        entityId: approval.id,
        metadata: {
          type: approval.type,
          title: approval.title,
        },
      });

      return reply.status(201).send({
        approval,
        evaluation,
      });
    }
  );
}
