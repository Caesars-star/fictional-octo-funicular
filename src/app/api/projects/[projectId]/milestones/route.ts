import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireSessionUser } from "@/lib/rbac";
import { createMilestoneSchema } from "@/lib/validations/milestone";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { projectId } = await params;
    await requireProjectAccess(user, projectId, { minProjectRole: "MEMBER" });

    const body = await request.json();
    const data = createMilestoneSchema.parse(body);

    if (data.contractId) {
      const contract = await prisma.contract.findUnique({ where: { id: data.contractId } });
      if (!contract || contract.projectId !== projectId) {
        throw new ApiError(400, "That contract does not belong to this project.");
      }
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        contractId: data.contractId || null,
        name: data.name,
        description: data.description || null,
        plannedDate: data.plannedDate,
        percentage: data.percentage,
        responsibleOrgId: data.responsibleOrgId || null,
        paymentAmount: data.paymentAmount,
        notes: data.notes || null,
        createdById: user.id,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "MILESTONE_CREATED",
      entityType: "Milestone",
      entityId: milestone.id,
      metadata: { projectId, name: data.name },
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
