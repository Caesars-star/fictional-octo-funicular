import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin, requireOrgAccess, requireSessionUser } from "@/lib/rbac";
import { createProjectSchema } from "@/lib/validations/project";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const organizationId = request.nextUrl.searchParams.get("organizationId") ?? undefined;

    const where = isPlatformAdmin(user.role)
      ? (organizationId ? { organizationId } : {})
      : {
          organizationId: organizationId,
          organization: { memberships: { some: { userId: user.id, status: "ACTIVE" as const } } },
        };

    const projects = await prisma.project.findMany({
      where,
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await request.json();
    const data = createProjectSchema.parse(body);

    await requireOrgAccess(user, data.organizationId);

    const project = await prisma.project.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        type: data.type,
        description: data.description || null,
        location: data.location || null,
        latitude: data.latitude,
        longitude: data.longitude,
        landReference: data.landReference || null,
        estimatedProjectValue: data.estimatedProjectValue,
        estimatedConstructionCost: data.estimatedConstructionCost,
        startDate: data.startDate,
        expectedCompletion: data.expectedCompletion,
        status: data.status,
        createdById: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    await logAudit({
      actorId: user.id,
      action: "PROJECT_CREATED",
      entityType: "Project",
      entityId: project.id,
      metadata: { organizationId: data.organizationId, name: data.name },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
