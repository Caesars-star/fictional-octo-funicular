import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDeliveryAccess, requireSessionUser } from "@/lib/rbac";
import { DELIVERY_STATUS_TRANSITIONS, updateDeliverySchema } from "@/lib/validations/delivery";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { recomputePurchaseOrderDeliveryStatus } from "@/lib/purchase-orders";

interface RouteParams {
  params: Promise<{ deliveryId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { deliveryId } = await params;

    const body = await request.json();
    const data = updateDeliverySchema.parse(body);

    // Verifying a delivery is a manager-level confirmation that what arrived
    // matches what was recorded — distinct from front-line staff logging
    // receipt of the goods.
    const requiresManager = data.status === "VERIFIED";
    await requireDeliveryAccess(user, deliveryId, {
      minProjectRole: requiresManager ? "MANAGER" : "MEMBER",
    });

    const current = await prisma.delivery.findUniqueOrThrow({ where: { id: deliveryId } });

    if (data.status && data.status !== current.status) {
      const allowed = DELIVERY_STATUS_TRANSITIONS[current.status];
      if (!allowed.includes(data.status)) {
        throw new ApiError(400, `A delivery cannot move from ${current.status} to ${data.status}.`);
      }
    }

    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.status === "DELIVERED" && !current.deliveredDate && { deliveredDate: new Date() }),
        ...(data.deliveredDate !== undefined && { deliveredDate: data.deliveredDate }),
        ...(data.location !== undefined && { location: data.location || null }),
        ...(data.receivedById !== undefined && { receivedById: data.receivedById }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });

    if (data.status && data.status !== current.status) {
      await recomputePurchaseOrderDeliveryStatus(current.purchaseOrderId);
    }

    await logAudit({
      actorId: user.id,
      action: "DELIVERY_UPDATED",
      entityType: "Delivery",
      entityId: deliveryId,
      metadata: data,
    });

    return NextResponse.json({ delivery });
  } catch (error) {
    return handleApiError(error);
  }
}
