import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireSessionUser } from "@/lib/rbac";
import { createRfqSchema } from "@/lib/validations/rfq";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { projectId } = await params;
    await requireProjectAccess(user, projectId, { minProjectRole: "MEMBER" });

    const body = await request.json();
    const data = createRfqSchema.parse(body);

    const boqItems = await prisma.boqItem.findMany({
      where: { id: { in: data.boqItemIds }, boq: { projectId } },
    });
    if (boqItems.length !== data.boqItemIds.length) {
      throw new ApiError(400, "One or more selected BOQ items are invalid for this project.");
    }

    const rfq = await prisma.rfq.create({
      data: {
        projectId,
        boqId: boqItems[0]?.boqId,
        title: data.title,
        status: data.supplierIds.length > 0 ? "OPEN" : "DRAFT",
        dueDate: data.dueDate,
        notes: data.notes || null,
        createdById: user.id,
        items: {
          create: boqItems.map((item) => ({
            boqItemId: item.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
        rfqSuppliers: {
          create: data.supplierIds.map((supplierId) => ({ supplierId })),
        },
      },
      include: { items: true, rfqSuppliers: true },
    });

    // Reflect that these BOQ items have entered procurement.
    await prisma.boqItem.updateMany({
      where: { id: { in: data.boqItemIds } },
      data: { procurementStatus: "RFQ_SENT" },
    });

    await logAudit({
      actorId: user.id,
      action: "RFQ_CREATED",
      entityType: "Rfq",
      entityId: rfq.id,
      metadata: { projectId, boqItemIds: data.boqItemIds, supplierIds: data.supplierIds },
    });

    return NextResponse.json({ rfq }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
