import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireSessionUser } from "@/lib/rbac";
import { createBoqSchema } from "@/lib/validations/boq";
import { handleApiError } from "@/lib/api-error";
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
    const data = createBoqSchema.parse(body);

    const boq = await prisma.boq.create({
      data: {
        projectId,
        title: data.title,
        createdById: user.id,
        sections: { create: { name: "General", sequence: 0 } },
      },
      include: { sections: true },
    });

    await logAudit({
      actorId: user.id,
      action: "BOQ_CREATED",
      entityType: "Boq",
      entityId: boq.id,
      metadata: { projectId },
    });

    return NextResponse.json({ boq }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
