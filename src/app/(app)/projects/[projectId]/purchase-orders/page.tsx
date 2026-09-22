import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function ProjectPurchaseOrdersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { projectId },
    include: { supplier: { include: { organization: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase orders"
        description="Issued once a quotation is accepted. Create one from the RFQ comparison view."
      />

      {purchaseOrders.length === 0 ? (
        <EmptyState
          title="No purchase orders yet"
          description="Accept a supplier quotation on an RFQ to create your first purchase order."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Expected delivery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.map((po) => (
              <TableRow key={po.id}>
                <TableCell>
                  <Link
                    href={`/projects/${projectId}/purchase-orders/${po.id}`}
                    className="font-medium hover:underline"
                  >
                    {po.poNumber}
                  </Link>
                </TableCell>
                <TableCell>{po.supplier.organization.name}</TableCell>
                <TableCell>
                  <StatusBadge status={po.status} />
                </TableCell>
                <TableCell className="text-right">{formatMoney(po.total.toString())}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(po.expectedDeliveryDate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
