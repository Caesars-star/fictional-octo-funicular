import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePurchaseOrderAccess, requireSessionUser } from "@/lib/rbac";
import { PO_STATUS_TRANSITIONS, updatePurchaseOrderSchema } from "@/lib/validations/purchase-order";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ purchaseOrderId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { purchaseOrderId } = await params;
    await requirePurchaseOrderAccess(user, purchaseOrderId, { minProjectRole: "MANAGER" });

    const body = await request.json();
    const data = updatePurchaseOrderSchema.parse(body);

    const current = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: purchaseOrderId },
    });

    if (data.status && data.status !== current.status) {
      const allowed = PO_STATUS_TRANSITIONS[current.status];
      if (!allowed.includes(data.status)) {
        throw new ApiError(
          400,
          `A purchase order cannot move from ${current.status} to ${data.status}.`,
        );
      }
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.status === "ISSUED" && !current.issueDate && { issueDate: new Date() }),
        ...(data.expectedDeliveryDate !== undefined && {
          expectedDeliveryDate: data.expectedDeliveryDate,
        }),
        ...(data.terms !== undefined && { terms: data.terms || null }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "PURCHASE_ORDER_UPDATED",
      entityType: "PurchaseOrder",
      entityId: purchaseOrderId,
      metadata: data,
    });

    return NextResponse.json({ purchaseOrder });
  } catch (error) {
    return handleApiError(error);
  }
}
