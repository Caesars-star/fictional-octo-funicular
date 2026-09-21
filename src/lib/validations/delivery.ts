import { z } from "zod";
import { DeliveryStatus } from "@prisma/client";

const positiveDecimalString = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, `${label} must be greater than zero`);

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

export const createDeliverySchema = z.object({
  expectedDate: optionalDate,
  location: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        purchaseOrderItemId: z.string().min(1),
        quantity: positiveDecimalString("Quantity"),
      }),
    )
    .min(1, "Record at least one item being delivered"),
});

export const updateDeliverySchema = z.object({
  status: z.nativeEnum(DeliveryStatus).optional(),
  deliveredDate: optionalDate,
  location: z.string().trim().max(300).optional().or(z.literal("")),
  receivedById: z.string().optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

/** Legal forward transitions for a delivery's status. */
export const DELIVERY_STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  EXPECTED: ["IN_TRANSIT", "DELIVERED", "DISPUTED"],
  IN_TRANSIT: ["DELIVERED", "DISPUTED"],
  DELIVERED: ["VERIFIED", "DISPUTED"],
  VERIFIED: [],
  DISPUTED: ["DELIVERED", "VERIFIED"],
};

/** Delivery statuses that count as "received" for PO fulfilment purposes. */
export const FULFILLING_DELIVERY_STATUSES: DeliveryStatus[] = ["DELIVERED", "VERIFIED"];
