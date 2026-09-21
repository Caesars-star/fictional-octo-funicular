import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireSessionUser } from "@/lib/rbac";
import { updateProjectSchema } from "@/lib/validations/project";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { projectId } = await params;
    await requireProjectAccess(user, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: { select: { id: true, name: true } },
        site: true,
        members: { include: { user: true } },
        _count: { select: { boqs: true, rfqs: true, documents: true } },
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { projectId } = await params;
    await requireProjectAccess(user, projectId, { minProjectRole: "MANAGER" });

    const body = await request.json();
    const data = updateProjectSchema.parse(body);

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.location !== undefined && { location: data.location || null }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.landReference !== undefined && { landReference: data.landReference || null }),
        ...(data.estimatedProjectValue !== undefined && {
          estimatedProjectValue: data.estimatedProjectValue,
        }),
        ...(data.estimatedConstructionCost !== undefined && {
          estimatedConstructionCost: data.estimatedConstructionCost,
        }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.expectedCompletion !== undefined && { expectedCompletion: data.expectedCompletion }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    await logAudit({
      actorId: user.id,
      action: "PROJECT_UPDATED",
      entityType: "Project",
      entityId: project.id,
      metadata: data,
    });

    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}
