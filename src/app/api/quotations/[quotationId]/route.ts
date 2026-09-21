import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuotationProjectAccess, requireSessionUser } from "@/lib/rbac";
import { decideQuotationSchema } from "@/lib/validations/rfq";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ quotationId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { quotationId } = await params;
    await requireQuotationProjectAccess(user, quotationId, { minProjectRole: "MANAGER" });

    const body = await request.json();
    const data = decideQuotationSchema.parse(body);

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.update({
        where: { id: quotationId },
        data: { status: data.status },
        include: { rfq: true },
      });

      if (data.status === "ACCEPTED") {
        await tx.rfq.update({ where: { id: q.rfqId }, data: { status: "AWARDED" } });
        await tx.boqItem.updateMany({
          where: { rfqItems: { some: { quotationItems: { some: { quotationId } } } } },
          data: { procurementStatus: "ORDERED" },
        });
      }

      return q;
    });

    await logAudit({
      actorId: user.id,
      action: data.status === "ACCEPTED" ? "QUOTATION_ACCEPTED" : "QUOTATION_REJECTED",
      entityType: "Quotation",
      entityId: quotationId,
      metadata: { rfqId: quotation.rfqId },
    });

    return NextResponse.json({ quotation });
  } catch (error) {
    return handleApiError(error);
  }
}
