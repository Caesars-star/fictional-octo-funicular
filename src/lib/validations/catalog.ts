import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  parentId: z.string().optional().nullable(),
});

export const createUnitSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  abbreviation: z.string().trim().min(1, "Abbreviation is required").max(10),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  categoryId: z.string().min(1, "Category is required"),
  defaultUnitId: z.string().min(1, "Unit is required"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
});

export const addSupplierProductSchema = z.object({
  productId: z.string().min(1),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, "Price cannot be negative"),
  leadTimeDays: z.number().int().min(0).optional().nullable(),
});
