import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireContractAccess, requireSessionUser } from "@/lib/rbac";
import { addContractPartySchema } from "@/lib/validations/contract";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ contractId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { contractId } = await params;
    await requireContractAccess(user, contractId, { minProjectRole: "MANAGER" });

    const body = await request.json();
    const data = addContractPartySchema.parse(body);

    const party = await prisma.contractParty.upsert({
      where: { contractId_organizationId: { contractId, organizationId: data.organizationId } },
      create: { contractId, organizationId: data.organizationId, role: data.role },
      update: { role: data.role },
      include: { organization: true },
    });

    await logAudit({
      actorId: user.id,
      action: "CONTRACT_PARTY_ADDED",
      entityType: "Contract",
      entityId: contractId,
      metadata: { organizationId: data.organizationId, role: data.role },
    });

    return NextResponse.json({ party }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
