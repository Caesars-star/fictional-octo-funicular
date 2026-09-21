import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoqAccess, requireSessionUser } from "@/lib/rbac";
import { updateBoqItemSchema } from "@/lib/validations/boq";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { multiplyDecimal } from "@/lib/money";

interface RouteParams {
  params: Promise<{ boqId: string; itemId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { boqId, itemId } = await params;
    await requireBoqAccess(user, boqId, { minProjectRole: "MEMBER" });

    const existing = await prisma.boqItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.boqId !== boqId) throw new ApiError(404, "BOQ item not found.");

    const body = await request.json();
    const data = updateBoqItemSchema.parse(body);

    const quantity = data.quantity ?? existing.quantity.toString();
    const estimatedUnitCost = data.estimatedUnitCost ?? existing.estimatedUnitCost.toString();
    const estimatedTotalCost = multiplyDecimal(quantity, estimatedUnitCost);

    const actualUnitCost =
      data.actualUnitCost === undefined ? undefined : data.actualUnitCost;
    const actualTotalCost =
      actualUnitCost === undefined
        ? undefined
        : actualUnitCost === null
          ? null
          : multiplyDecimal(quantity, actualUnitCost);

    const item = await prisma.boqItem.update({
      where: { id: itemId },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.estimatedUnitCost !== undefined && { estimatedUnitCost: data.estimatedUnitCost }),
        estimatedTotalCost,
        ...(actualUnitCost !== undefined && { actualUnitCost }),
        ...(actualTotalCost !== undefined && { actualTotalCost }),
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
        ...(data.procurementStatus !== undefined && { procurementStatus: data.procurementStatus }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "BOQ_ITEM_UPDATED",
      entityType: "BoqItem",
      entityId: itemId,
      metadata: data,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { boqId, itemId } = await params;
    await requireBoqAccess(user, boqId, { minProjectRole: "MEMBER" });

    const existing = await prisma.boqItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.boqId !== boqId) throw new ApiError(404, "BOQ item not found.");

    await prisma.boqItem.delete({ where: { id: itemId } });

    await logAudit({
      actorId: user.id,
      action: "BOQ_ITEM_DELETED",
      entityType: "BoqItem",
      entityId: itemId,
      metadata: { boqId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
