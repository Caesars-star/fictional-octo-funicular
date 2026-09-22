import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRfqAccess, requireSessionUser } from "@/lib/rbac";
import { inviteSuppliersSchema } from "@/lib/validations/rfq";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ rfqId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { rfqId } = await params;
    await requireRfqAccess(user, rfqId, { minProjectRole: "MEMBER" });

    const body = await request.json();
    const data = inviteSuppliersSchema.parse(body);

    const rfq = await prisma.rfq.findUniqueOrThrow({ where: { id: rfqId } });

    await prisma.$transaction([
      ...data.supplierIds.map((supplierId) =>
        prisma.rfqSupplier.upsert({
          where: { rfqId_supplierId: { rfqId, supplierId } },
          create: { rfqId, supplierId },
          update: {},
        }),
      ),
      ...(rfq.status === "DRAFT"
        ? [prisma.rfq.update({ where: { id: rfqId }, data: { status: "OPEN" as const } })]
        : []),
    ]);

    await logAudit({
      actorId: user.id,
      action: "RFQ_SUPPLIERS_INVITED",
      entityType: "Rfq",
      entityId: rfqId,
      metadata: { supplierIds: data.supplierIds },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
