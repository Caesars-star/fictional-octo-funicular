import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/rbac";
import { createProductSchema } from "@/lib/validations/catalog";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    await requireSessionUser();
    const categoryId = request.nextUrl.searchParams.get("categoryId") ?? undefined;

    const products = await prisma.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: { category: true, defaultUnit: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ products });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await request.json();
    const data = createProductSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        defaultUnitId: data.defaultUnitId,
        description: data.description || null,
        sku: data.sku || null,
      },
      include: { category: true, defaultUnit: true },
    });

    await logAudit({
      actorId: user.id,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product.id,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
