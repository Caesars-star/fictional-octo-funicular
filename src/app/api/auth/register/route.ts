import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { OrganizationType, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { handleApiError, ApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

/** Every persona a person can self-register with maps to one starter org type. */
const ORG_TYPE_BY_ROLE: Record<UserRole, OrganizationType> = {
  PLATFORM_ADMIN: OrganizationType.PLATFORM,
  ORGANIZATION_ADMIN: OrganizationType.OTHER,
  DEVELOPER: OrganizationType.DEVELOPER,
  PROJECT_MANAGER: OrganizationType.DEVELOPER,
  SUPPLIER: OrganizationType.SUPPLIER,
  CONTRACTOR: OrganizationType.CONTRACTOR,
  CONSULTANT: OrganizationType.CONSULTANT,
  AGENT: OrganizationType.AGENT_NETWORK,
  FINANCE_PARTNER: OrganizationType.OTHER,
  HOMEOWNER: OrganizationType.DEVELOPER,
};

const BCRYPT_COST_FACTOR = 12;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST_FACTOR);
    const orgType = ORG_TYPE_BY_ROLE[data.role];

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          role: data.role,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          type: orgType,
        },
      });

      await tx.organizationMembership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      if (data.role === "SUPPLIER") {
        await tx.supplier.create({
          data: { organizationId: organization.id, contactEmail: email },
        });
      }
      if (data.role === "CONTRACTOR") {
        await tx.contractor.create({
          data: { organizationId: organization.id },
        });
      }
      if (data.role === "AGENT") {
        await tx.agent.create({
          data: { userId: user.id, organizationId: organization.id },
        });
      }

      return { user, organization };
    });

    await logAudit({
      actorId: result.user.id,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: result.user.id,
      metadata: { organizationId: result.organization.id, role: data.role },
    });

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
