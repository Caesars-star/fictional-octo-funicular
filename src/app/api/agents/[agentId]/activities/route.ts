import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgentAccess, requireSessionUser } from "@/lib/rbac";
import { createAgentActivitySchema } from "@/lib/validations/agent";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { agentId } = await params;
    await requireAgentAccess(user, agentId);

    const body = await request.json();
    const data = createAgentActivitySchema.parse(body);

    if (data.relatedLeadId) {
      const lead = await prisma.lead.findUnique({ where: { id: data.relatedLeadId } });
      if (!lead || lead.agentId !== agentId) {
        throw new ApiError(400, "That lead does not belong to this agent.");
      }
    }

    const activity = await prisma.agentActivity.create({
      data: {
        agentId,
        type: data.type,
        description: data.description,
        relatedProjectId: data.relatedProjectId || null,
        relatedOrganizationId: data.relatedOrganizationId || null,
        relatedLeadId: data.relatedLeadId || null,
        occurredAt: data.occurredAt ?? new Date(),
        createdById: user.id,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "AGENT_ACTIVITY_LOGGED",
      entityType: "AgentActivity",
      entityId: activity.id,
      metadata: { agentId, type: data.type },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
