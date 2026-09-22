import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireContractAccess, requireSessionUser } from "@/lib/rbac";
import { CONTRACT_STATUS_TRANSITIONS, updateContractSchema } from "@/lib/validations/contract";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ contractId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { contractId } = await params;
    await requireContractAccess(user, contractId, { minProjectRole: "MANAGER" });

    const body = await request.json();
    const data = updateContractSchema.parse(body);

    const current = await prisma.contract.findUniqueOrThrow({ where: { id: contractId } });

    if (data.status && data.status !== current.status) {
      const allowed = CONTRACT_STATUS_TRANSITIONS[current.status];
      if (!allowed.includes(data.status)) {
        throw new ApiError(
          400,
          `A contract cannot move from ${current.status} to ${data.status}.`,
        );
      }
    }

    const contract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.contractType !== undefined && { contractType: data.contractType }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.obligations !== undefined && { obligations: data.obligations || null }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "CONTRACT_UPDATED",
      entityType: "Contract",
      entityId: contractId,
      metadata: data,
    });

    return NextResponse.json({ contract });
  } catch (error) {
    return handleApiError(error);
  }
}
