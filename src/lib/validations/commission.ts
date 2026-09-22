import { z } from "zod";
import { CommissionSourceType, CommissionStatus } from "@prisma/client";

export const createCommissionSchema = z.object({
  leadId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  sourceType: z.nativeEnum(CommissionSourceType),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
});

export const updateCommissionSchema = z.object({
  status: z.nativeEnum(CommissionStatus),
});

/**
 * Legal forward transitions for a commission's status. Every transition
 * (including the initial PENDING creation) requires requireAgentOversight —
 * an agent can never create, approve, or mark their own commission paid.
 * Deliberately not derived from Payment/Invoice: a standalone record of
 * what's owed, tracked the same way every other financial record in this
 * codebase is (see "Financial controls" in SECURITY.md).
 */
export const COMMISSION_STATUS_TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
  PENDING: ["APPROVED", "CANCELLED"],
  APPROVED: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};
