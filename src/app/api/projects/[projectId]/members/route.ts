import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireSessionUser } from "@/lib/rbac";
import { addProjectMemberSchema } from "@/lib/validations/project";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { projectId } = await params;
    await requireProjectAccess(user, projectId, { minProjectRole: "MANAGER" });

    const body = await request.json();
    const data = addProjectMemberSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (!targetUser) {
      throw new ApiError(
        404,
        "No TARA account exists for that email yet. Ask them to register first.",
      );
    }

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: targetUser.id } },
      create: { projectId, userId: targetUser.id, role: data.role },
      update: { role: data.role },
      include: { user: true },
    });

    await logAudit({
      actorId: user.id,
      action: "PROJECT_MEMBER_ADDED",
      entityType: "Project",
      entityId: projectId,
      metadata: { memberUserId: targetUser.id, role: data.role },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
