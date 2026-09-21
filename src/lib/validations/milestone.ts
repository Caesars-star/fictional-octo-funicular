import { z } from "zod";
import { MilestoneStatus } from "@prisma/client";

const optionalDecimal = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : String(v)));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

export const createMilestoneSchema = z.object({
  contractId: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  plannedDate: optionalDate,
  percentage: z.number().int().min(0).max(100).optional(),
  responsibleOrgId: z.string().optional().nullable(),
  paymentAmount: optionalDecimal,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  plannedDate: optionalDate,
  actualDate: optionalDate,
  percentage: z.number().int().min(0).max(100).optional(),
  responsibleOrgId: z.string().optional().nullable(),
  paymentAmount: optionalDecimal,
  status: z.nativeEnum(MilestoneStatus).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

/** Legal forward transitions for a milestone's status. */
export const MILESTONE_STATUS_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus[]> = {
  PLANNED: ["IN_PROGRESS", "DELAYED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "DELAYED", "CANCELLED"],
  COMPLETED: ["VERIFIED", "IN_PROGRESS"],
  VERIFIED: [],
  DELAYED: ["IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};
