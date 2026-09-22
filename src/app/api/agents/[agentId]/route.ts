import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgentAccess, requireAgentOversight, requireSessionUser } from "@/lib/rbac";
import { AGENT_OVERSIGHT_ONLY_FIELDS, updateAgentSchema } from "@/lib/validations/agent";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { agentId } = await params;

    const body = await request.json();
    const data = updateAgentSchema.parse(body);

    const requestsOversightField = AGENT_OVERSIGHT_ONLY_FIELDS.some(
      (field) => data[field] !== undefined,
    );

    if (requestsOversightField) {
      // status/commissionRate changes require org or platform oversight —
      // never the agent acting on their own account.
      await requireAgentOversight(user, agentId);
    } else {
      await requireAgentAccess(user, agentId);
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.region !== undefined && { region: data.region || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "AGENT_UPDATED",
      entityType: "Agent",
      entityId: agentId,
      metadata: data,
    });

    return NextResponse.json({ agent });
  } catch (error) {
    return handleApiError(error);
  }
}
