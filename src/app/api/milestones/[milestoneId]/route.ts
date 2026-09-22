import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMilestoneAccess, requireSessionUser } from "@/lib/rbac";
import { MILESTONE_STATUS_TRANSITIONS, updateMilestoneSchema } from "@/lib/validations/milestone";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ milestoneId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { milestoneId } = await params;

    const body = await request.json();
    const data = updateMilestoneSchema.parse(body);

    // Verifying a milestone is a manager-level confirmation, distinct from
    // the field/site update that marks work as complete.
    const requiresManager = data.status === "VERIFIED";
    await requireMilestoneAccess(user, milestoneId, {
      minProjectRole: requiresManager ? "MANAGER" : "MEMBER",
    });

    const current = await prisma.milestone.findUniqueOrThrow({ where: { id: milestoneId } });

    if (data.status && data.status !== current.status) {
      const allowed = MILESTONE_STATUS_TRANSITIONS[current.status];
      if (!allowed.includes(data.status)) {
        throw new ApiError(400, `A milestone cannot move from ${current.status} to ${data.status}.`);
      }
    }

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.plannedDate !== undefined && { plannedDate: data.plannedDate }),
        ...(data.actualDate !== undefined && { actualDate: data.actualDate }),
        ...(data.percentage !== undefined && { percentage: data.percentage }),
        ...(data.responsibleOrgId !== undefined && { responsibleOrgId: data.responsibleOrgId }),
        ...(data.paymentAmount !== undefined && { paymentAmount: data.paymentAmount }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.status === "COMPLETED" && !current.actualDate && { actualDate: new Date() }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "MILESTONE_UPDATED",
      entityType: "Milestone",
      entityId: milestoneId,
      metadata: data,
    });

    return NextResponse.json({ milestone });
  } catch (error) {
    return handleApiError(error);
  }
}
