import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess, requireSessionUser } from "@/lib/rbac";
import { addMemberSchema } from "@/lib/validations/organization";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ organizationId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { organizationId } = await params;
    await requireOrgAccess(user, organizationId, { minRole: "ADMIN" });

    const body = await request.json();
    const data = addMemberSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (!targetUser) {
      throw new ApiError(
        404,
        "No TARA account exists for that email yet. Ask them to register first.",
      );
    }

    const existing = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUser.id } },
    });
    if (existing && existing.status === "ACTIVE") {
      throw new ApiError(409, "This user is already a member of the organization.");
    }

    const membership = existing
      ? await prisma.organizationMembership.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", role: data.role },
          include: { user: true },
        })
      : await prisma.organizationMembership.create({
          data: { organizationId, userId: targetUser.id, role: data.role },
          include: { user: true },
        });

    await logAudit({
      actorId: user.id,
      action: "ORGANIZATION_MEMBER_ADDED",
      entityType: "Organization",
      entityId: organizationId,
      metadata: { memberUserId: targetUser.id, role: data.role },
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
