import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/rbac";
import { createUnitSchema } from "@/lib/validations/catalog";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireSessionUser();
    const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ units });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await request.json();
    const data = createUnitSchema.parse(body);

    const unit = await prisma.unit.create({
      data: { name: data.name, abbreviation: data.abbreviation },
    });

    await logAudit({
      actorId: user.id,
      action: "UNIT_CREATED",
      entityType: "Unit",
      entityId: unit.id,
    });

    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
