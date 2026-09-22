import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgentAccess, requireAgentOversight, requireSessionUser } from "@/lib/rbac";
import { LEAD_STATUS_TRANSITIONS, updateLeadSchema } from "@/lib/validations/agent";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ leadId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { leadId } = await params;

    const body = await request.json();
    const data = updateLeadSchema.parse(body);

    const current = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!current) throw new ApiError(404, "Lead not found.");

    if (data.status && data.status !== current.status) {
      const allowed = LEAD_STATUS_TRANSITIONS[current.status];
      if (!allowed.includes(data.status)) {
        throw new ApiError(400, `A lead cannot move from ${current.status} to ${data.status}.`);
      }
    }

    // Converting a lead is the event that earns a commission — gated to
    // org/platform oversight, never the agent themselves.
    const requiresOversight = data.status === "CONVERTED";
    if (requiresOversight) {
      await requireAgentOversight(user, current.agentId);
    } else {
      await requireAgentAccess(user, current.agentId);
    }

    if (data.convertedOrganizationId !== undefined && data.status !== "CONVERTED") {
      throw new ApiError(400, "A converted organization can only be set when converting a lead.");
    }

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(data.contactName !== undefined && { contactName: data.contactName || null }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone || null }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.convertedOrganizationId !== undefined && {
          convertedOrganizationId: data.convertedOrganizationId,
        }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "LEAD_UPDATED",
      entityType: "Lead",
      entityId: leadId,
      metadata: data,
    });

    return NextResponse.json({ lead });
  } catch (error) {
    return handleApiError(error);
  }
}
