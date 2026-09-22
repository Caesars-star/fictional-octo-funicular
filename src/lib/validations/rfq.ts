import { z } from "zod";

export const createRfqSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  boqItemIds: z.array(z.string()).min(1, "Select at least one BOQ item"),
  supplierIds: z.array(z.string()).default([]),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const inviteSuppliersSchema = z.object({
  supplierIds: z.array(z.string()).min(1),
});

const priceString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, "Must be zero or greater");

export const submitQuotationSchema = z.object({
  supplierId: z.string().min(1),
  items: z
    .array(
      z.object({
        rfqItemId: z.string().min(1),
        unitPrice: priceString,
      }),
    )
    .min(1, "Price at least one line item"),
  deliveryCost: priceString.default("0"),
  taxAmount: priceString.default("0"),
  validUntil: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  submit: z.boolean().default(false),
});

export const decideQuotationSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});
