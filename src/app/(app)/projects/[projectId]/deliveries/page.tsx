import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default async function ProjectDeliveriesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const deliveries = await prisma.delivery.findMany({
    where: { purchaseOrder: { projectId } },
    include: {
      purchaseOrder: { include: { supplier: { include: { organization: true } } } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description="Everything recorded as delivered across this project's purchase orders."
      />

      {deliveries.length === 0 ? (
        <EmptyState
          title="No deliveries recorded yet"
          description="Record deliveries from a purchase order's detail page as materials arrive."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Purchase order</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                <TableCell>
                  <Link
                    href={`/projects/${projectId}/purchase-orders/${delivery.purchaseOrderId}`}
                    className="font-medium hover:underline"
                  >
                    {delivery.purchaseOrder.poNumber}
                  </Link>
                </TableCell>
                <TableCell>{delivery.purchaseOrder.supplier.organization.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {delivery.items.map((i) => i.description).join(", ")}
                </TableCell>
                <TableCell>
                  <StatusBadge status={delivery.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(delivery.deliveredDate ?? delivery.expectedDate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
