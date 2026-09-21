import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePurchaseOrderAccess, requireSessionUser } from "@/lib/rbac";
import { createDeliverySchema } from "@/lib/validations/delivery";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ purchaseOrderId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { purchaseOrderId } = await params;
    await requirePurchaseOrderAccess(user, purchaseOrderId, { minProjectRole: "MEMBER" });

    const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchaseOrderId } });
    if (po.status !== "ACCEPTED" && po.status !== "PARTIALLY_DELIVERED") {
      throw new ApiError(
        400,
        "Deliveries can only be recorded against an accepted purchase order.",
      );
    }

    const body = await request.json();
    const data = createDeliverySchema.parse(body);

    const poItems = await prisma.purchaseOrderItem.findMany({
      where: { id: { in: data.items.map((i) => i.purchaseOrderItemId) }, purchaseOrderId },
    });
    if (poItems.length !== data.items.length) {
      throw new ApiError(400, "One or more delivered items do not belong to this purchase order.");
    }
    const poItemById = new Map(poItems.map((i) => [i.id, i]));

    const delivery = await prisma.delivery.create({
      data: {
        purchaseOrderId,
        status: "EXPECTED",
        expectedDate: data.expectedDate,
        location: data.location || null,
        notes: data.notes || null,
        createdById: user.id,
        items: {
          create: data.items.map((line) => {
            const poItem = poItemById.get(line.purchaseOrderItemId)!;
            return {
              purchaseOrderItemId: poItem.id,
              description: poItem.description,
              quantity: line.quantity,
              unit: poItem.unit,
            };
          }),
        },
      },
      include: { items: true },
    });

    await logAudit({
      actorId: user.id,
      action: "DELIVERY_CREATED",
      entityType: "Delivery",
      entityId: delivery.id,
      metadata: { purchaseOrderId },
    });

    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
