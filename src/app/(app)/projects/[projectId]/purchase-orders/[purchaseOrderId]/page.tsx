import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { PurchaseOrderStatusControl } from "@/components/purchase-orders/purchase-order-status-control";
import { PO_STATUS_TRANSITIONS } from "@/lib/validations/purchase-order";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatQuantity } from "@/lib/utils";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; purchaseOrderId: string }>;
}) {
  const { projectId, purchaseOrderId } = await params;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      items: true,
      supplier: { include: { organization: true } },
      quotation: { select: { id: true, rfqId: true } },
    },
  });
  if (!po || po.projectId !== projectId) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.poNumber}
        description={po.supplier.organization.name}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={po.status} />
            <PurchaseOrderStatusControl
              purchaseOrderId={po.id}
              allowedTransitions={PO_STATUS_TRANSITIONS[po.status]}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Issue date: </span>
              {formatDate(po.issueDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Expected delivery: </span>
              {formatDate(po.expectedDeliveryDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Terms: </span>
              {po.terms ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{formatQuantity(item.quantity.toString())}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.unitPrice.toString())}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(item.lineTotal.toString())}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} className="text-right text-muted-foreground">
                    Delivery
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatMoney(po.deliveryCost.toString())}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-right text-muted-foreground">
                    Tax
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatMoney(po.taxAmount.toString())}
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell colSpan={4} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatMoney(po.total.toString())}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
