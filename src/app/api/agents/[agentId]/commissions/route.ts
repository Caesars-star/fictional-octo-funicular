import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgentOversight, requireSessionUser } from "@/lib/rbac";
import { createCommissionSchema } from "@/lib/validations/commission";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { agentId } = await params;
    // Creating a commission is a financial claim on the agent's behalf —
    // never the agent themselves.
    await requireAgentOversight(user, agentId);

    const body = await request.json();
    const data = createCommissionSchema.parse(body);

    if (data.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
      if (!lead || lead.agentId !== agentId) {
        throw new ApiError(400, "That lead does not belong to this agent.");
      }
    }

    const commission = await prisma.commission.create({
      data: {
        agentId,
        leadId: data.leadId || null,
        projectId: data.projectId || null,
        sourceType: data.sourceType,
        description: data.description || null,
        amount: data.amount,
        createdById: user.id,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "COMMISSION_CREATED",
      entityType: "Commission",
      entityId: commission.id,
      metadata: { agentId, amount: data.amount, sourceType: data.sourceType },
    });

    return NextResponse.json({ commission }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
