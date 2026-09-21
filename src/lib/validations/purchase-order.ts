import { z } from "zod";
import { PoStatus } from "@prisma/client";

export const createPurchaseOrderSchema = z.object({
  expectedDeliveryDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  terms: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updatePurchaseOrderSchema = z.object({
  status: z.nativeEnum(PoStatus).optional(),
  expectedDeliveryDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  terms: z.string().trim().max(2000).optional().or(z.literal("")),
});

/** Legal forward transitions for a purchase order's status. */
export const PO_STATUS_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  DRAFT: ["ISSUED", "CANCELLED"],
  ISSUED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PARTIALLY_DELIVERED", "COMPLETED", "CANCELLED"],
  PARTIALLY_DELIVERED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
