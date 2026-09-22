import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

const positiveDecimalString = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, `${label} must be greater than zero`);

export const createPaymentSchema = z.object({
  payerOrgId: z.string().min(1, "Select who is paying"),
  amount: positiveDecimalString("Amount"),
  paymentDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : new Date())),
  paymentMethod: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
