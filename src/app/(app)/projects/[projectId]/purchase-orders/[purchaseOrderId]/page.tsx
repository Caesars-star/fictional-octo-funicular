import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PurchaseOrderStatusControl } from "@/components/purchase-orders/purchase-order-status-control";
import { RecordDeliveryDialog } from "@/components/deliveries/record-delivery-dialog";
import { DeliveryStatusControl } from "@/components/deliveries/delivery-status-control";
import { PO_STATUS_TRANSITIONS } from "@/lib/validations/purchase-order";
import { DELIVERY_STATUS_TRANSITIONS, FULFILLING_DELIVERY_STATUSES } from "@/lib/validations/delivery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatQuantity } from "@/lib/utils";
import { sumDecimal } from "@/lib/money";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; purchaseOrderId: string }>;
}) {
  const { projectId, purchaseOrderId } = await params;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      items: { include: { deliveryItems: { include: { delivery: { select: { status: true } } } } } },
      supplier: { include: { organization: true } },
      quotation: { select: { id: true, rfqId: true } },
      deliveries: {
        include: { items: true, receivedBy: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!po || po.projectId !== projectId) notFound();

  const deliverableItems = po.items.map((item) => {
    const delivered = sumDecimal(
      item.deliveryItems
        .filter((di) => FULFILLING_DELIVERY_STATUSES.includes(di.delivery.status))
        .map((di) => di.quantity),
    );
    const outstanding = item.quantity.sub(delivered);
    return {
      id: item.id,
      description: item.description,
      unit: item.unit,
      outstandingQuantity: (outstanding.greaterThan(0) ? outstanding : sumDecimal([])).toString(),
    };
  });

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Deliveries</CardTitle>
          <RecordDeliveryDialog purchaseOrderId={po.id} items={deliverableItems} />
        </CardHeader>
        <CardContent>
          {po.deliveries.length === 0 ? (
            <EmptyState
              title="No deliveries recorded yet"
              description="Record a delivery as materials arrive on site."
            />
          ) : (
            <div className="space-y-4">
              {po.deliveries.map((delivery) => (
                <div key={delivery.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={delivery.status} />
                      <span className="text-sm text-muted-foreground">
                        {delivery.deliveredDate
                          ? `Delivered ${formatDate(delivery.deliveredDate)}`
                          : delivery.expectedDate
                            ? `Expected ${formatDate(delivery.expectedDate)}`
                            : "No date set"}
                      </span>
                      {delivery.location && (
                        <span className="text-sm text-muted-foreground">· {delivery.location}</span>
                      )}
                    </div>
                    <DeliveryStatusControl
                      deliveryId={delivery.id}
                      allowedTransitions={DELIVERY_STATUS_TRANSITIONS[delivery.status]}
                    />
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {delivery.items.map((item) => (
                      <li key={item.id}>
                        {item.description} — {formatQuantity(item.quantity.toString())} {item.unit}
                      </li>
                    ))}
                  </ul>
                  {delivery.receivedBy && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Received by {delivery.receivedBy.firstName} {delivery.receivedBy.lastName}
                    </p>
                  )}
                  {delivery.notes && <p className="mt-2 text-sm">{delivery.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
