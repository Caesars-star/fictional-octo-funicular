import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoqAccess, requireSessionUser } from "@/lib/rbac";
import { updateSectionSchema } from "@/lib/validations/boq";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ boqId: string; sectionId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { boqId, sectionId } = await params;
    await requireBoqAccess(user, boqId, { minProjectRole: "MEMBER" });

    const section = await prisma.boqSection.findUnique({ where: { id: sectionId } });
    if (!section || section.boqId !== boqId) throw new ApiError(404, "Section not found.");

    const body = await request.json();
    const data = updateSectionSchema.parse(body);

    const updated = await prisma.boqSection.update({ where: { id: sectionId }, data });

    await logAudit({
      actorId: user.id,
      action: "BOQ_SECTION_UPDATED",
      entityType: "BoqSection",
      entityId: sectionId,
      metadata: data,
    });

    return NextResponse.json({ section: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { boqId, sectionId } = await params;
    await requireBoqAccess(user, boqId, { minProjectRole: "MANAGER" });

    const section = await prisma.boqSection.findUnique({ where: { id: sectionId } });
    if (!section || section.boqId !== boqId) throw new ApiError(404, "Section not found.");

    await prisma.boqSection.delete({ where: { id: sectionId } });

    await logAudit({
      actorId: user.id,
      action: "BOQ_SECTION_DELETED",
      entityType: "BoqSection",
      entityId: sectionId,
      metadata: { boqId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
