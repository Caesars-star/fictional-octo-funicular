import { z } from "zod";
import { ProjectType, ProjectStatus, TenureType, PlanningStatus } from "@prisma/client";

const optionalDecimal = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : String(v)));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

export const createProjectSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(200),
  type: z.nativeEnum(ProjectType),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  location: z.string().trim().max(300).optional().or(z.literal("")),
  latitude: optionalDecimal,
  longitude: optionalDecimal,
  landReference: z.string().trim().max(200).optional().or(z.literal("")),
  estimatedProjectValue: optionalDecimal,
  estimatedConstructionCost: optionalDecimal,
  startDate: optionalDate,
  expectedCompletion: optionalDate,
  status: z.nativeEnum(ProjectStatus).default("CONCEPT"),
});

export const updateProjectSchema = createProjectSchema
  .omit({ organizationId: true })
  .partial();

export const siteSchema = z.object({
  parcelReference: z.string().trim().max(200).optional().or(z.literal("")),
  location: z.string().trim().max(300).optional().or(z.literal("")),
  latitude: optionalDecimal,
  longitude: optionalDecimal,
  areaValue: optionalDecimal,
  areaUnit: z.string().trim().max(30).optional().or(z.literal("")),
  tenureType: z.nativeEnum(TenureType).optional(),
  ownershipInfo: z.string().trim().max(2000).optional().or(z.literal("")),
  planningStatus: z.nativeEnum(PlanningStatus).optional(),
  developmentNotes: z.string().trim().max(4000).optional().or(z.literal("")),
  constraints: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const addProjectMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["OWNER", "MANAGER", "MEMBER", "VIEWER"]).default("MEMBER"),
});
