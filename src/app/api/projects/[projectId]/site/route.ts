import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireSessionUser } from "@/lib/rbac";
import { siteSchema } from "@/lib/validations/project";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { projectId } = await params;
    await requireProjectAccess(user, projectId, { minProjectRole: "MANAGER" });

    const body = await request.json();
    const data = siteSchema.parse(body);

    const payload = {
      parcelReference: data.parcelReference || null,
      location: data.location || null,
      latitude: data.latitude,
      longitude: data.longitude,
      areaValue: data.areaValue,
      areaUnit: data.areaUnit || null,
      tenureType: data.tenureType,
      ownershipInfo: data.ownershipInfo || null,
      planningStatus: data.planningStatus,
      developmentNotes: data.developmentNotes || null,
      constraints: data.constraints || null,
    };

    const site = await prisma.site.upsert({
      where: { projectId },
      create: { projectId, ...payload },
      update: payload,
    });

    await logAudit({
      actorId: user.id,
      action: "SITE_UPDATED",
      entityType: "Site",
      entityId: site.id,
      metadata: { projectId },
    });

    return NextResponse.json({ site });
  } catch (error) {
    return handleApiError(error);
  }
}
