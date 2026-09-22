import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: { organization: true, _count: { select: { products: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Materials suppliers available for RFQs across TARA projects."
      />

      {suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          description="Suppliers appear here once they register a supplier organization on TARA."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Link key={s.id} href={`/suppliers/${s.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{s.organization.name}</CardTitle>
                    <StatusBadge status={s.verificationStatus} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{s.location ?? "Location not set"}</p>
                  <p>{s._count.products} product{s._count.products === 1 ? "" : "s"} listed</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
