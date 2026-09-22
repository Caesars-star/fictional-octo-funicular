import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/rbac";
import { createCategorySchema } from "@/lib/validations/catalog";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireSessionUser();
    const categories = await prisma.productCategory.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await request.json();
    const data = createCategorySchema.parse(body);

    const category = await prisma.productCategory.create({
      data: { name: data.name, parentId: data.parentId || null },
    });

    await logAudit({
      actorId: user.id,
      action: "PRODUCT_CATEGORY_CREATED",
      entityType: "ProductCategory",
      entityId: category.id,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
