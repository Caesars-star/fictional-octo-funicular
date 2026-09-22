import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCommissionOversight, requireSessionUser } from "@/lib/rbac";
import { COMMISSION_STATUS_TRANSITIONS, updateCommissionSchema } from "@/lib/validations/commission";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ commissionId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { commissionId } = await params;
    // Approving/paying/cancelling a commission is oversight-only — never
    // the agent themselves, enforced regardless of the target status.
    await requireCommissionOversight(user, commissionId);

    const body = await request.json();
    const data = updateCommissionSchema.parse(body);

    const current = await prisma.commission.findUniqueOrThrow({ where: { id: commissionId } });

    const allowed = COMMISSION_STATUS_TRANSITIONS[current.status];
    if (!allowed.includes(data.status)) {
      throw new ApiError(400, `A commission cannot move from ${current.status} to ${data.status}.`);
    }

    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: { status: data.status },
    });

    await logAudit({
      actorId: user.id,
      action: "COMMISSION_UPDATED",
      entityType: "Commission",
      entityId: commissionId,
      metadata: { status: data.status },
    });

    return NextResponse.json({ commission });
  } catch (error) {
    return handleApiError(error);
  }
}
