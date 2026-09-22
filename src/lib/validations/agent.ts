import { z } from "zod";
import { AgentActivityType, AgentStatus, LeadStatus, LeadType } from "@prisma/client";

const optionalDecimal = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : String(v)));

const optionalEmail = z.string().trim().email().optional().or(z.literal(""));

export const updateAgentSchema = z.object({
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  region: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.nativeEnum(AgentStatus).optional(),
  commissionRate: optionalDecimal,
});

/**
 * Fields only an org/platform overseer may set on an Agent — never the
 * agent themselves. Enforced in src/app/api/agents/[agentId]/route.ts by
 * rejecting these keys unless requireAgentOversight succeeds.
 */
export const AGENT_OVERSIGHT_ONLY_FIELDS = ["status", "commissionRate"] as const;

export const createLeadSchema = z.object({
  type: z.nativeEnum(LeadType),
  organizationName: z.string().trim().min(1, "Organization name is required").max(200),
  contactName: z.string().trim().max(200).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  contactEmail: optionalEmail,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateLeadSchema = z.object({
  contactName: z.string().trim().max(200).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  contactEmail: optionalEmail,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.nativeEnum(LeadStatus).optional(),
  convertedOrganizationId: z.string().optional().nullable(),
});

/**
 * Legal forward transitions for a lead's status. CONVERTED requires
 * requireAgentOversight (not the agent themselves) — converting a lead is
 * the event that earns a commission, so it's manager-gated the same way
 * milestone VERIFIED / invoice APPROVED are elsewhere in this codebase.
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED", "LOST"],
  CONTACTED: ["QUALIFIED", "LOST"],
  QUALIFIED: ["CONVERTED", "LOST"],
  CONVERTED: [],
  LOST: [],
};

export const createAgentActivitySchema = z.object({
  type: z.nativeEnum(AgentActivityType),
  description: z.string().trim().min(1, "Description is required").max(2000),
  relatedProjectId: z.string().optional().nullable(),
  relatedOrganizationId: z.string().optional().nullable(),
  relatedLeadId: z.string().optional().nullable(),
  occurredAt: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});
