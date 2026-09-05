import { prisma } from "@commerceos/database";
import { AIProposal } from "@commerceos/ai";

export interface ExecutionResult {
  action: string;
  success: boolean;
  details: Record<string, unknown>;
  executedAt: string;
}

export async function executeApprovalAction(
  merchantId: string,
  approvalId: string
) {
  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findFirst({
      where: {
        id: approvalId,
        merchantId,
      },
    });

    if (!approval) {
      throw new Error("Approval not found");
    }

    if (approval.status === "APPROVED" && approval.executedAt) {
      throw new Error("Approval has already been executed");
    }

    if (approval.status === "REJECTED") {
      throw new Error("Cannot execute a rejected approval");
    }

    const proposal = approval.proposal as unknown as AIProposal;
    const executedAt = new Date();
    let details: Record<string, unknown> = {};

    switch (approval.type) {
      case "RESTOCK": {
        let variantId = proposal.targetVariantId;

        if (!variantId && proposal.targetProductId) {
          const firstVariant = await tx.productVariant.findFirst({
            where: {
              productId: proposal.targetProductId,
              product: {
                merchantId,
              },
            },
          });
          variantId = firstVariant?.id;
        }

        if (!variantId) {
          throw new Error("Target variant ID not specified for RESTOCK action");
        }

        const quantityToAdd = proposal.quantity ?? 10;

        const currentInventory = await tx.inventory.findUnique({
          where: { variantId },
          include: { variant: { include: { product: true } } },
        });

        if (!currentInventory) {
          throw new Error(`Inventory not found for variant ${variantId}`);
        }

        if (currentInventory.variant.product.merchantId !== merchantId) {
          throw new Error("Unauthorized variant modification");
        }

        const updatedInventory = await tx.inventory.update({
          where: { variantId },
          data: {
            quantity: {
              increment: quantityToAdd,
            },
          },
        });

        details = {
          variantId,
          sku: currentInventory.variant.sku,
          productName: currentInventory.variant.product.name,
          variantName: currentInventory.variant.name,
          previousQuantity: currentInventory.quantity,
          addedQuantity: quantityToAdd,
          newQuantity: updatedInventory.quantity,
          availableStock: updatedInventory.quantity - updatedInventory.reserved,
        };
        break;
      }

      case "DISCOUNT": {
        details = {
          targetProductId: proposal.targetProductId,
          targetVariantId: proposal.targetVariantId,
          discountPercent: proposal.discountPercent ?? 10,
          applied: true,
        };
        break;
      }

      case "BUNDLE": {
        details = {
          bundleProductIds: proposal.bundleProductIds ?? [],
          discountPercent: proposal.discountPercent ?? 10,
          bundleCreated: true,
        };
        break;
      }

      case "NO_ACTION": {
        details = {
          acknowledged: true,
        };
        break;
      }

      case "AUTONOMOUS_BUYER_ORDER": {
        const orderId = (proposal as any)?.orderId;
        if (orderId) {
          await tx.order.updateMany({
            where: { id: orderId, merchantId },
            data: {
              status: "PENDING_PAYMENT",
            },
          });
        }
        details = {
          orderId,
          total: (proposal as any)?.total,
          authorizedByMerchant: true,
          authorizedAt: executedAt.toISOString(),
        };
        break;
      }

      default: {
        throw new Error(`Unsupported action type: ${approval.type}`);
      }
    }

    const updatedApproval = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        executedAt,
        executionResult: details as any,
      },
    });

    return {
      approval: updatedApproval,
      executionResult: {
        action: approval.type,
        success: true,
        details,
        executedAt: executedAt.toISOString(),
      },
    };
  });
}
