import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoqAccess, requireSessionUser } from "@/lib/rbac";
import { createBoqItemSchema } from "@/lib/validations/boq";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { multiplyDecimal } from "@/lib/money";

interface RouteParams {
  params: Promise<{ boqId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { boqId } = await params;
    await requireBoqAccess(user, boqId, { minProjectRole: "MEMBER" });

    const body = await request.json();
    const data = createBoqItemSchema.parse(body);

    const section = await prisma.boqSection.findUnique({ where: { id: data.boqSectionId } });
    if (!section || section.boqId !== boqId) {
      throw new ApiError(400, "That section does not belong to this BOQ.");
    }

    // Server-computed: never trust a client-submitted line total.
    const estimatedTotalCost = multiplyDecimal(data.quantity, data.estimatedUnitCost);

    const item = await prisma.boqItem.create({
      data: {
        boqId,
        boqSectionId: data.boqSectionId,
        productId: data.productId || null,
        description: data.description,
        quantity: data.quantity,
        unit: data.unit,
        estimatedUnitCost: data.estimatedUnitCost,
        estimatedTotalCost,
        sequence: data.sequence ?? 0,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "BOQ_ITEM_CREATED",
      entityType: "BoqItem",
      entityId: item.id,
      metadata: { boqId, description: data.description },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
