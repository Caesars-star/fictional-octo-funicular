import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgentAccess, requireSessionUser } from "@/lib/rbac";
import { createLeadSchema } from "@/lib/validations/agent";
import { handleApiError } from "@/lib/api-error";
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
    const data = createLeadSchema.parse(body);

    const lead = await prisma.lead.create({
      data: {
        agentId,
        type: data.type,
        organizationName: data.organizationName,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        notes: data.notes || null,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "LEAD_CREATED",
      entityType: "Lead",
      entityId: lead.id,
      metadata: { agentId, organizationName: data.organizationName },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
