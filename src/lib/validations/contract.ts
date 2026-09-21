import { z } from "zod";
import { ContractType, ContractStatus, ContractPartyRole } from "@prisma/client";

const optionalDecimal = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : String(v)));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

export const createContractSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  contractType: z.nativeEnum(ContractType),
  value: optionalDecimal,
  startDate: optionalDate,
  endDate: optionalDate,
  obligations: z.string().trim().max(4000).optional().or(z.literal("")),
  parties: z
    .array(
      z.object({
        organizationId: z.string().min(1),
        role: z.nativeEnum(ContractPartyRole),
      }),
    )
    .default([]),
});

export const updateContractSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  contractType: z.nativeEnum(ContractType).optional(),
  value: optionalDecimal,
  startDate: optionalDate,
  endDate: optionalDate,
  obligations: z.string().trim().max(4000).optional().or(z.literal("")),
  status: z.nativeEnum(ContractStatus).optional(),
});

export const addContractPartySchema = z.object({
  organizationId: z.string().min(1),
  role: z.nativeEnum(ContractPartyRole),
});

/** Legal forward transitions for a contract's status. */
export const CONTRACT_STATUS_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "TERMINATED"],
  COMPLETED: [],
  TERMINATED: [],
  CANCELLED: [],
};
