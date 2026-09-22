import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePaymentAccess, requireSessionUser } from "@/lib/rbac";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { recomputeInvoicePaymentStatus } from "@/lib/invoices";

interface RouteParams {
  params: Promise<{ paymentId: string }>;
}

/**
 * Reverses a payment. Payments are never edited or deleted once recorded —
 * a mistaken entry is reversed (kept, marked REVERSED) and a corrected one
 * recorded separately, preserving the audit trail.
 */
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { paymentId } = await params;
    await requirePaymentAccess(user, paymentId, { minProjectRole: "MANAGER" });

    const current = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (current.status !== "RECORDED") {
      throw new ApiError(400, "Only a recorded payment can be reversed.");
    }

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REVERSED" },
    });

    await recomputeInvoicePaymentStatus(current.invoiceId);

    await logAudit({
      actorId: user.id,
      action: "PAYMENT_REVERSED",
      entityType: "Payment",
      entityId: paymentId,
      metadata: { invoiceId: current.invoiceId },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}
