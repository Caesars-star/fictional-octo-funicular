import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQuotationProjectAccess, requireSessionUser } from "@/lib/rbac";
import { createPurchaseOrderSchema } from "@/lib/validations/purchase-order";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ quotationId: string }>;
}

/** Creates a purchase order from an ACCEPTED quotation, copying its line items and totals. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { quotationId } = await params;
    await requireQuotationProjectAccess(user, quotationId, { minProjectRole: "MANAGER" });

    const body = await request.json();
    const data = createPurchaseOrderSchema.parse(body);

    const quotation = await prisma.quotation.findUniqueOrThrow({
      where: { id: quotationId },
      include: { items: true, rfq: { select: { projectId: true } } },
    });

    if (quotation.status !== "ACCEPTED") {
      throw new ApiError(400, "A purchase order can only be created from an accepted quotation.");
    }

    const existing = await prisma.purchaseOrder.findUnique({ where: { quotationId } });
    if (existing) {
      throw new ApiError(409, "A purchase order already exists for this quotation.");
    }

    const projectId = quotation.rfq.projectId;

    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const poCount = await tx.purchaseOrder.count({ where: { projectId } });
      const poNumber = `PO-${String(poCount + 1).padStart(4, "0")}`;

      return tx.purchaseOrder.create({
        data: {
          projectId,
          quotationId,
          supplierId: quotation.supplierId,
          poNumber,
          status: "DRAFT",
          expectedDeliveryDate: data.expectedDeliveryDate,
          terms: data.terms || null,
          deliveryCost: quotation.deliveryCost,
          taxAmount: quotation.taxAmount,
          subtotal: quotation.subtotal,
          total: quotation.total,
          createdById: user.id,
          items: {
            create: quotation.items.map((item) => ({
              quotationItemId: item.id,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { items: true },
      });
    });

    await logAudit({
      actorId: user.id,
      action: "PURCHASE_ORDER_CREATED",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      metadata: { quotationId, projectId, poNumber: purchaseOrder.poNumber },
    });

    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
