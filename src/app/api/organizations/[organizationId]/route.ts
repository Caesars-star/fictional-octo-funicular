import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess, requireSessionUser } from "@/lib/rbac";
import { updateOrganizationSchema } from "@/lib/validations/organization";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ organizationId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { organizationId } = await params;
    await requireOrgAccess(user, organizationId);

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
        projects: { orderBy: { createdAt: "desc" } },
        supplier: true,
        contractor: true,
      },
    });
    if (!organization) throw new ApiError(404, "Organization not found.");

    return NextResponse.json({ organization });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { organizationId } = await params;
    await requireOrgAccess(user, organizationId, { minRole: "ADMIN" });

    const body = await request.json();
    const data = updateOrganizationSchema.parse(body);

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.registrationNumber !== undefined && {
          registrationNumber: data.registrationNumber || null,
        }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address || null }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "ORGANIZATION_UPDATED",
      entityType: "Organization",
      entityId: organization.id,
      metadata: data,
    });

    return NextResponse.json({ organization });
  } catch (error) {
    return handleApiError(error);
  }
}
