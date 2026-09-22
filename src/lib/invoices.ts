import { prisma } from "@/lib/prisma";
import { sumDecimal } from "@/lib/money";
import { PAYABLE_INVOICE_STATUSES } from "@/lib/validations/invoice";

/**
 * Recomputes an invoice's payment status from its recorded (non-reversed)
 * payments. Called after any payment is created or reversed. Only ever
 * moves an invoice *forward* (APPROVED -> PARTIALLY_PAID -> PAID) — never
 * reverts it automatically, and never touches an invoice that isn't
 * already APPROVED or PARTIALLY_PAID (a DRAFT/SUBMITTED/UNDER_REVIEW/
 * DISPUTED invoice hasn't been approved for payment yet; PAID is
 * terminal). Mirrors recomputePurchaseOrderDeliveryStatus.
 */
export async function recomputeInvoicePaymentStatus(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { where: { status: "RECORDED" }, select: { amount: true } } },
  });
  if (!invoice) return;
  if (!PAYABLE_INVOICE_STATUSES.includes(invoice.status)) return;

  const paid = sumDecimal(invoice.payments.map((p) => p.amount));
  const nextStatus = paid.greaterThanOrEqualTo(invoice.total)
    ? "PAID"
    : paid.greaterThan(0)
      ? "PARTIALLY_PAID"
      : null;

  if (nextStatus && nextStatus !== invoice.status) {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: nextStatus } });
  }
}
