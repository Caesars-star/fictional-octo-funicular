import { z } from "zod";
import { UserRole } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required"),
});

/**
 * Roles a person can self-select at registration. PLATFORM_ADMIN is granted
 * by an existing admin, never through self-registration.
 */
export const REGISTERABLE_ROLES = [
  UserRole.DEVELOPER,
  UserRole.PROJECT_MANAGER,
  UserRole.SUPPLIER,
  UserRole.CONTRACTOR,
  UserRole.CONSULTANT,
  UserRole.AGENT,
  UserRole.HOMEOWNER,
] as const;

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
  role: z.enum(REGISTERABLE_ROLES),
  organizationName: z.string().trim().min(1, "Organization name is required").max(200),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});
