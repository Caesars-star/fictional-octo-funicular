import { z } from "zod";
import { BoqStatus, ProcurementStatus } from "@prisma/client";

export const createBoqSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
});

export const updateBoqSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.nativeEnum(BoqStatus).optional(),
});

export const createSectionSchema = z.object({
  name: z.string().trim().min(1, "Section name is required").max(200),
  sequence: z.number().int().min(0).optional(),
});

export const updateSectionSchema = createSectionSchema.partial();

const positiveDecimalString = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0;
    }, `${label} must be greater than zero`);

const nonNegativeDecimalString = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0;
    }, `${label} cannot be negative`);

export const createBoqItemSchema = z.object({
  boqSectionId: z.string().min(1),
  productId: z.string().optional().nullable(),
  description: z.string().trim().min(1, "Description is required").max(500),
  quantity: positiveDecimalString("Quantity"),
  unit: z.string().trim().min(1, "Unit is required").max(30),
  estimatedUnitCost: nonNegativeDecimalString("Estimated unit cost"),
  sequence: z.number().int().min(0).optional(),
});

export const updateBoqItemSchema = z.object({
  description: z.string().trim().min(1).max(500).optional(),
  quantity: positiveDecimalString("Quantity").optional(),
  unit: z.string().trim().min(1).max(30).optional(),
  estimatedUnitCost: nonNegativeDecimalString("Estimated unit cost").optional(),
  actualUnitCost: nonNegativeDecimalString("Actual unit cost").optional().nullable(),
  supplierId: z.string().optional().nullable(),
  procurementStatus: z.nativeEnum(ProcurementStatus).optional(),
});
