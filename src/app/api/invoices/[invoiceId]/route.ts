import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInvoiceAccess, requireSessionUser } from "@/lib/rbac";
import { INVOICE_STATUS_TRANSITIONS, updateInvoiceSchema } from "@/lib/validations/invoice";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { invoiceId } = await params;

    const body = await request.json();
    const data = updateInvoiceSchema.parse(body);

    // Approving an invoice authorizes it for payment — a manager-level
    // financial decision, distinct from the clerical review steps before it.
    const requiresManager = data.status === "APPROVED";
    await requireInvoiceAccess(user, invoiceId, {
      minProjectRole: requiresManager ? "MANAGER" : "MEMBER",
    });

    const current = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

    if (data.status && data.status !== current.status) {
      const allowed = INVOICE_STATUS_TRANSITIONS[current.status];
      if (!allowed.includes(data.status)) {
        throw new ApiError(400, `An invoice cannot move from ${current.status} to ${data.status}.`);
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "INVOICE_UPDATED",
      entityType: "Invoice",
      entityId: invoiceId,
      metadata: data,
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    return handleApiError(error);
  }
}
