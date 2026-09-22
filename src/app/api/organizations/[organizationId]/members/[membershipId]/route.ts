import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess, requireSessionUser } from "@/lib/rbac";
import { updateMemberSchema } from "@/lib/validations/organization";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ organizationId: string; membershipId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { organizationId, membershipId } = await params;
    await requireOrgAccess(user, organizationId, { minRole: "ADMIN" });

    const membership = await prisma.organizationMembership.findUnique({
      where: { id: membershipId },
    });
    if (!membership || membership.organizationId !== organizationId) {
      throw new ApiError(404, "Membership not found.");
    }
    if (membership.role === "OWNER" && membership.userId !== user.id) {
      throw new ApiError(403, "Organization owners cannot be modified by another admin.");
    }

    const body = await request.json();
    const data = updateMemberSchema.parse(body);

    const updated = await prisma.organizationMembership.update({
      where: { id: membershipId },
      data,
      include: { user: true },
    });

    await logAudit({
      actorId: user.id,
      action: "ORGANIZATION_MEMBER_UPDATED",
      entityType: "OrganizationMembership",
      entityId: membershipId,
      metadata: data,
    });

    return NextResponse.json({ membership: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
