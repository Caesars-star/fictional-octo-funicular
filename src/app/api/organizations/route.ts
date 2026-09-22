import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, isPlatformAdmin } from "@/lib/rbac";
import { createOrganizationSchema } from "@/lib/validations/organization";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireSessionUser();

    const organizations = isPlatformAdmin(user.role)
      ? await prisma.organization.findMany({
          include: { _count: { select: { projects: true, memberships: true } } },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.organization
          .findMany({
            where: { memberships: { some: { userId: user.id, status: "ACTIVE" } } },
            include: { _count: { select: { projects: true, memberships: true } } },
            orderBy: { createdAt: "desc" },
          });

    return NextResponse.json({ organizations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await request.json();
    const data = createOrganizationSchema.parse(body);

    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name,
          type: data.type,
          description: data.description || null,
          registrationNumber: data.registrationNumber || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
        },
      });
      await tx.organizationMembership.create({
        data: { organizationId: org.id, userId: user.id, role: "OWNER" },
      });
      return org;
    });

    await logAudit({
      actorId: user.id,
      action: "ORGANIZATION_CREATED",
      entityType: "Organization",
      entityId: organization.id,
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
