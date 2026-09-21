import { z } from "zod";
import { OrganizationType, OrgMemberRole } from "@prisma/client";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  type: z.nativeEnum(OrganizationType),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  registrationNumber: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const addMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.nativeEnum(OrgMemberRole).default("MEMBER"),
});

export const updateMemberSchema = z.object({
  role: z.nativeEnum(OrgMemberRole).optional(),
  status: z.enum(["ACTIVE", "REMOVED"]).optional(),
});
