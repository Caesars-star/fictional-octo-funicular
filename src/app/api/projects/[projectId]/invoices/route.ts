import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireSessionUser } from "@/lib/rbac";
import { createInvoiceSchema } from "@/lib/validations/invoice";
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
    const data = createInvoiceSchema.parse(body);

    if (data.purchaseOrderId) {
      const po = await prisma.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId } });
      if (!po || po.projectId !== projectId) {
        throw new ApiError(400, "That purchase order does not belong to this project.");
      }
    }
    if (data.contractId) {
      const contract = await prisma.contract.findUnique({ where: { id: data.contractId } });
      if (!contract || contract.projectId !== projectId) {
        throw new ApiError(400, "That contract does not belong to this project.");
      }
    }
    if (data.milestoneId) {
      const milestone = await prisma.milestone.findUnique({ where: { id: data.milestoneId } });
      if (!milestone || milestone.projectId !== projectId) {
        throw new ApiError(400, "That milestone does not belong to this project.");
      }
    }

    // Server-computed: never trust a client-submitted total.
    const total = new Prisma.Decimal(data.subtotal).add(data.taxAmount);

    let invoice;
    try {
      invoice = await prisma.invoice.create({
        data: {
          projectId,
          issuedByOrgId: data.issuedByOrgId,
          purchaseOrderId: data.purchaseOrderId || null,
          contractId: data.contractId || null,
          milestoneId: data.milestoneId || null,
          invoiceNumber: data.invoiceNumber,
          dueDate: data.dueDate,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          total,
          notes: data.notes || null,
          createdById: user.id,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(
          409,
          "This organization has already submitted an invoice with that number on this project.",
        );
      }
      throw error;
    }

    await logAudit({
      actorId: user.id,
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { projectId, invoiceNumber: data.invoiceNumber },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
