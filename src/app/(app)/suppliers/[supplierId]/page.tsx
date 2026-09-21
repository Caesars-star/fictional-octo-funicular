import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { AddSupplierProductDialog } from "@/components/catalog/add-supplier-product-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId } = await params;

  const [supplier, products] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        organization: true,
        products: { include: { product: { include: { defaultUnit: true } } } },
      },
    }),
    prisma.product.findMany({ include: { defaultUnit: true }, orderBy: { name: "asc" } }),
  ]);
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.organization.name}
        description={supplier.location ?? "Supplier"}
        actions={<StatusBadge status={supplier.verificationStatus} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Contact: </span>
              {supplier.contactName ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {supplier.contactPhone ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {supplier.contactEmail ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Service area: </span>
              {supplier.serviceArea ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Price list</CardTitle>
            <AddSupplierProductDialog supplierId={supplier.id} products={products} />
          </CardHeader>
          <CardContent>
            {supplier.products.length === 0 ? (
              <EmptyState
                title="No prices listed yet"
                description="Add products and prices so this supplier can be invited to RFQs."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Lead time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.products.map((sp) => (
                    <TableRow key={sp.id}>
                      <TableCell className="font-medium">{sp.product.name}</TableCell>
                      <TableCell>{sp.product.defaultUnit.abbreviation}</TableCell>
                      <TableCell className="text-right">{formatMoney(sp.price.toString())}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {sp.leadTimeDays ? `${sp.leadTimeDays} days` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
