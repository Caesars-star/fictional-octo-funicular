import { z } from "zod";
import { InvoiceStatus } from "@prisma/client";

const requiredDecimalString = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, `${label} cannot be negative`);

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

export const createInvoiceSchema = z.object({
  issuedByOrgId: z.string().min(1, "Select who issued this invoice"),
  purchaseOrderId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  invoiceNumber: z.string().trim().min(1, "Invoice number is required").max(100),
  dueDate: optionalDate,
  subtotal: requiredDecimalString("Subtotal"),
  taxAmount: requiredDecimalString("Tax").default("0"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateInvoiceSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  dueDate: optionalDate,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

/**
 * Legal forward transitions for an invoice's status. PARTIALLY_PAID and
 * PAID are deliberately unreachable here — they are only ever set by
 * recomputeInvoicePaymentStatus, derived from recorded Payments, never by
 * a direct PATCH.
 */
export const INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "DISPUTED"],
  UNDER_REVIEW: ["APPROVED", "DISPUTED"],
  APPROVED: ["DISPUTED"],
  PARTIALLY_PAID: ["DISPUTED"],
  PAID: [],
  DISPUTED: ["UNDER_REVIEW"],
};

/** Invoice statuses a Payment may be recorded against. */
export const PAYABLE_INVOICE_STATUSES: InvoiceStatus[] = ["APPROVED", "PARTIALLY_PAID"];
