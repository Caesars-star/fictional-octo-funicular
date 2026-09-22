import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInvoiceAccess, requireSessionUser } from "@/lib/rbac";
import { createPaymentSchema } from "@/lib/validations/payment";
import { PAYABLE_INVOICE_STATUSES } from "@/lib/validations/invoice";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { recomputeInvoicePaymentStatus } from "@/lib/invoices";

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { invoiceId } = await params;
    // Recording that money changed hands outside TARA is a significant
    // financial action — always requires project manager authorization.
    await requireInvoiceAccess(user, invoiceId, { minProjectRole: "MANAGER" });

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (!PAYABLE_INVOICE_STATUSES.includes(invoice.status)) {
      throw new ApiError(
        400,
        "Payments can only be recorded against an approved (or partially paid) invoice.",
      );
    }

    const body = await request.json();
    const data = createPaymentSchema.parse(body);

    const payment = await prisma.payment.create({
      data: {
        projectId: invoice.projectId,
        invoiceId,
        payerOrgId: data.payerOrgId,
        payeeOrgId: invoice.issuedByOrgId,
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        reference: data.reference || null,
        notes: data.notes || null,
        recordedById: user.id,
      },
    });

    await recomputeInvoicePaymentStatus(invoiceId);

    await logAudit({
      actorId: user.id,
      action: "PAYMENT_RECORDED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { invoiceId, amount: data.amount },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
