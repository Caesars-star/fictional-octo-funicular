import type { OrgMemberRole, ProjectMemberRole, UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export interface SessionUser {
  id: string;
  email?: string | null;
  role: UserRole;
}

/** Resolves the signed-in user or throws a 401/403 ApiError. Use in route handlers. */
export async function requireSessionUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "You must be signed in.");
  if (session.user.status !== "ACTIVE") {
    throw new ApiError(403, "Your account is not active.");
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: session.user.role,
  };
}

export function isPlatformAdmin(role: UserRole): boolean {
  return role === "PLATFORM_ADMIN";
}

const ORG_ROLE_RANK: Record<OrgMemberRole, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 };
const PROJECT_ROLE_RANK: Record<ProjectMemberRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  MANAGER: 2,
  OWNER: 3,
};

export async function getOrgMembership(userId: string, organizationId: string) {
  return prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
}

/**
 * Confirms the user may act within an organization. Platform admins bypass
 * membership checks entirely. Throws a 403 ApiError otherwise.
 */
export async function requireOrgAccess(
  user: SessionUser,
  organizationId: string,
  opts: { minRole?: OrgMemberRole } = {},
) {
  if (isPlatformAdmin(user.role)) return { bypass: true as const };

  const membership = await getOrgMembership(user.id, organizationId);
  if (!membership || membership.status !== "ACTIVE") {
    throw new ApiError(403, "You do not have access to this organization.");
  }
  if (opts.minRole && ORG_ROLE_RANK[membership.role] < ORG_ROLE_RANK[opts.minRole]) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }
  return { bypass: false as const, membership };
}

/**
 * Confirms the user may act within a project: platform admins, org
 * OWNER/ADMIN members of the project's organization, and explicit project
 * members (subject to opts.minProjectRole) are all granted access.
 */
export async function requireProjectAccess(
  user: SessionUser,
  projectId: string,
  opts: { minProjectRole?: ProjectMemberRole } = {},
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, organizationId: true },
  });
  if (!project) throw new ApiError(404, "Project not found.");

  if (isPlatformAdmin(user.role)) return project;

  const [orgMembership, projectMembership] = await Promise.all([
    getOrgMembership(user.id, project.organizationId),
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    }),
  ]);

  const orgIsManager =
    orgMembership?.status === "ACTIVE" &&
    (orgMembership.role === "OWNER" || orgMembership.role === "ADMIN");
  if (orgIsManager) return project;

  if (!projectMembership) {
    throw new ApiError(403, "You do not have access to this project.");
  }
  if (
    opts.minProjectRole &&
    PROJECT_ROLE_RANK[projectMembership.role] < PROJECT_ROLE_RANK[opts.minProjectRole]
  ) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }
  return project;
}

/** Page-safe (non-throwing) variant of requireOrgAccess, for server components. */
export async function canAccessOrg(user: SessionUser, organizationId: string): Promise<boolean> {
  if (isPlatformAdmin(user.role)) return true;
  const membership = await getOrgMembership(user.id, organizationId);
  return !!membership && membership.status === "ACTIVE";
}

/** Resolves a BOQ's project and applies the same access rules as requireProjectAccess. */
export async function requireBoqAccess(
  user: SessionUser,
  boqId: string,
  opts: { minProjectRole?: ProjectMemberRole } = {},
) {
  const boq = await prisma.boq.findUnique({ where: { id: boqId }, select: { projectId: true } });
  if (!boq) throw new ApiError(404, "BOQ not found.");
  await requireProjectAccess(user, boq.projectId, opts);
  return boq;
}

/** Resolves an RFQ's project and applies the same access rules as requireProjectAccess. */
export async function requireRfqAccess(
  user: SessionUser,
  rfqId: string,
  opts: { minProjectRole?: ProjectMemberRole } = {},
) {
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId }, select: { projectId: true } });
  if (!rfq) throw new ApiError(404, "RFQ not found.");
  await requireProjectAccess(user, rfq.projectId, opts);
  return rfq;
}

/** Resolves a PurchaseOrder's project and applies the same access rules as requireProjectAccess. */
export async function requirePurchaseOrderAccess(
  user: SessionUser,
  purchaseOrderId: string,
  opts: { minProjectRole?: ProjectMemberRole } = {},
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { projectId: true },
  });
  if (!po) throw new ApiError(404, "Purchase order not found.");
  await requireProjectAccess(user, po.projectId, opts);
  return po;
}

/** Resolves a Contract's project and applies the same access rules as requireProjectAccess. */
export async function requireContractAccess(
  user: SessionUser,
  contractId: string,
  opts: { minProjectRole?: ProjectMemberRole } = {},
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { projectId: true },
  });
  if (!contract) throw new ApiError(404, "Contract not found.");
  await requireProjectAccess(user, contract.projectId, opts);
  return contract;
}

/** Resolves a Quotation's project and applies the same access rules as requireProjectAccess. */
export async function requireQuotationProjectAccess(
  user: SessionUser,
  quotationId: string,
  opts: { minProjectRole?: ProjectMemberRole } = {},
) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: { id: true, rfq: { select: { projectId: true } } },
  });
  if (!quotation) throw new ApiError(404, "Quotation not found.");
  await requireProjectAccess(user, quotation.rfq.projectId, opts);
  return quotation;
}

/** Page-safe (non-throwing) variant of requireProjectAccess, for server components. */
export async function canAccessProject(user: SessionUser, projectId: string): Promise<boolean> {
  try {
    await requireProjectAccess(user, projectId);
    return true;
  } catch {
    return false;
  }
}

/** Confirms the caller controls the given supplier organization (owns quotations, etc). */
export async function requireSupplierAccess(user: SessionUser, supplierId: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, organizationId: true },
  });
  if (!supplier) throw new ApiError(404, "Supplier not found.");
  if (isPlatformAdmin(user.role)) return supplier;

  const membership = await getOrgMembership(user.id, supplier.organizationId);
  if (!membership || membership.status !== "ACTIVE") {
    throw new ApiError(403, "You do not have access to this supplier account.");
  }
  return supplier;
}
