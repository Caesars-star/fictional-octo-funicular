import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requireSupplierAccess } from "@/lib/rbac";
import { submitQuotationSchema } from "@/lib/validations/rfq";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { multiplyDecimal, sumDecimal } from "@/lib/money";
import { Prisma } from "@prisma/client";

interface RouteParams {
  params: Promise<{ rfqId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { rfqId } = await params;

    const body = await request.json();
    const data = submitQuotationSchema.parse(body);

    await requireSupplierAccess(user, data.supplierId);

    const invitation = await prisma.rfqSupplier.findUnique({
      where: { rfqId_supplierId: { rfqId, supplierId: data.supplierId } },
    });
    if (!invitation) {
      throw new ApiError(403, "This supplier has not been invited to this RFQ.");
    }

    const rfqItems = await prisma.rfqItem.findMany({
      where: { id: { in: data.items.map((i) => i.rfqItemId) }, rfqId },
    });
    if (rfqItems.length !== data.items.length) {
      throw new ApiError(400, "One or more priced items do not belong to this RFQ.");
    }
    const rfqItemById = new Map(rfqItems.map((i) => [i.id, i]));

    // Server-computed line totals and grand total — never trust client math.
    const lineItems = data.items.map((line) => {
      const rfqItem = rfqItemById.get(line.rfqItemId)!;
      const lineTotal = multiplyDecimal(rfqItem.quantity, line.unitPrice);
      return {
        rfqItemId: rfqItem.id,
        description: rfqItem.description,
        quantity: rfqItem.quantity,
        unit: rfqItem.unit,
        unitPrice: new Prisma.Decimal(line.unitPrice),
        lineTotal,
      };
    });
    const subtotal = sumDecimal(lineItems.map((i) => i.lineTotal));
    const total = subtotal.add(data.deliveryCost).add(data.taxAmount);

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.upsert({
        where: { rfqId_supplierId: { rfqId, supplierId: data.supplierId } },
        create: {
          rfqId,
          supplierId: data.supplierId,
          status: data.submit ? "SUBMITTED" : "DRAFT",
          validUntil: data.validUntil,
          deliveryCost: data.deliveryCost,
          taxAmount: data.taxAmount,
          subtotal,
          total,
          notes: data.notes || null,
          submittedAt: data.submit ? new Date() : null,
        },
        update: {
          status: data.submit ? "SUBMITTED" : "DRAFT",
          validUntil: data.validUntil,
          deliveryCost: data.deliveryCost,
          taxAmount: data.taxAmount,
          subtotal,
          total,
          notes: data.notes || null,
          submittedAt: data.submit ? new Date() : null,
        },
      });

      await tx.quotationItem.deleteMany({ where: { quotationId: q.id } });
      await tx.quotationItem.createMany({
        data: lineItems.map((item) => ({ ...item, quotationId: q.id })),
      });

      if (data.submit) {
        await tx.rfqSupplier.update({
          where: { rfqId_supplierId: { rfqId, supplierId: data.supplierId } },
          data: { status: "QUOTED" },
        });
      }

      return q;
    });

    await logAudit({
      actorId: user.id,
      action: data.submit ? "QUOTATION_SUBMITTED" : "QUOTATION_DRAFT_SAVED",
      entityType: "Quotation",
      entityId: quotation.id,
      metadata: { rfqId, supplierId: data.supplierId, total: total.toString() },
    });

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
