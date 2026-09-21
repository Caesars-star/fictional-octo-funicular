import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser, requireSupplierAccess } from "@/lib/rbac";
import { addSupplierProductSchema } from "@/lib/validations/catalog";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ supplierId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSessionUser();
    const { supplierId } = await params;
    await requireSupplierAccess(user, supplierId);

    const body = await request.json();
    const data = addSupplierProductSchema.parse(body);

    const supplierProduct = await prisma.supplierProduct.upsert({
      where: { supplierId_productId: { supplierId, productId: data.productId } },
      create: {
        supplierId,
        productId: data.productId,
        price: data.price,
        leadTimeDays: data.leadTimeDays ?? null,
      },
      update: { price: data.price, leadTimeDays: data.leadTimeDays ?? null },
      include: { product: true },
    });

    await logAudit({
      actorId: user.id,
      action: "SUPPLIER_PRODUCT_UPSERTED",
      entityType: "SupplierProduct",
      entityId: supplierProduct.id,
      metadata: { supplierId, productId: data.productId, price: data.price },
    });

    return NextResponse.json({ supplierProduct }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
