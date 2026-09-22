import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoqAccess, requireSessionUser } from "@/lib/rbac";
import { createSectionSchema } from "@/lib/validations/boq";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ boqId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { boqId } = await params;
    await requireBoqAccess(user, boqId, { minProjectRole: "MEMBER" });

    const body = await request.json();
    const data = createSectionSchema.parse(body);

    const section = await prisma.boqSection.create({
      data: { boqId, name: data.name, sequence: data.sequence ?? 0 },
    });

    await logAudit({
      actorId: user.id,
      action: "BOQ_SECTION_CREATED",
      entityType: "BoqSection",
      entityId: section.id,
      metadata: { boqId },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
