import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireSessionUser } from "@/lib/rbac";
import { createContractSchema } from "@/lib/validations/contract";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { projectId } = await params;
    await requireProjectAccess(user, projectId, { minProjectRole: "MANAGER" });

    const body = await request.json();
    const data = createContractSchema.parse(body);

    const contract = await prisma.contract.create({
      data: {
        projectId,
        title: data.title,
        contractType: data.contractType,
        value: data.value,
        startDate: data.startDate,
        endDate: data.endDate,
        obligations: data.obligations || null,
        createdById: user.id,
        parties: {
          create: data.parties.map((p) => ({ organizationId: p.organizationId, role: p.role })),
        },
      },
      include: { parties: { include: { organization: true } } },
    });

    await logAudit({
      actorId: user.id,
      action: "CONTRACT_CREATED",
      entityType: "Contract",
      entityId: contract.id,
      metadata: { projectId, title: data.title },
    });

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
