import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { InviteSuppliersDialog } from "@/components/rfq/invite-suppliers-dialog";
import { QuotationDecisionButtons } from "@/components/rfq/quotation-decision-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatMoney, formatQuantity } from "@/lib/utils";

export default async function RfqDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; rfqId: string }>;
}) {
  const { projectId, rfqId } = await params;

  const rfq = await prisma.rfq.findUnique({
    where: { id: rfqId },
    include: {
      items: true,
      rfqSuppliers: { include: { supplier: { include: { organization: true } } } },
      quotations: {
        include: {
          supplier: { include: { organization: true } },
          items: true,
        },
      },
    },
  });
  if (!rfq || rfq.projectId !== projectId) notFound();

  const allSuppliers = await prisma.supplier.findMany({
    include: { organization: { select: { name: true } } },
  });
  const invitedIds = new Set(rfq.rfqSuppliers.map((rs) => rs.supplierId));
  const availableSuppliers = allSuppliers
    .filter((s) => !invitedIds.has(s.id))
    .map((s) => ({ id: s.id, name: s.organization.name }));

  const comparableQuotations = rfq.quotations
    .filter((q) => q.status !== "DRAFT")
    .sort((a, b) => Number(a.total) - Number(b.total));
  const lowestTotal =
    comparableQuotations.length > 0 ? Math.min(...comparableQuotations.map((q) => Number(q.total))) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={rfq.title}
        description={rfq.notes ?? undefined}
        actions={<StatusBadge status={rfq.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Items requested</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {rfq.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>{item.description}</span>
                  <span className="text-muted-foreground">
                    {formatQuantity(item.quantity.toString())} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Invited suppliers</CardTitle>
            <InviteSuppliersDialog rfqId={rfq.id} availableSuppliers={availableSuppliers} />
          </CardHeader>
          <CardContent>
            {rfq.rfqSuppliers.length === 0 ? (
              <EmptyState title="No suppliers invited yet" />
            ) : (
              <ul className="space-y-2 text-sm">
                {rfq.rfqSuppliers.map((rs) => (
                  <li key={rs.id} className="flex items-center justify-between">
                    <span>{rs.supplier.organization.name}</span>
                    <StatusBadge status={rs.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {comparableQuotations.length === 0 ? (
            <EmptyState
              title="No quotations submitted yet"
              description="Once invited suppliers submit their quotations, compare them here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  {comparableQuotations.map((q) => (
                    <TableHead key={q.id} className="text-right">
                      {q.supplier.organization.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    {comparableQuotations.map((q) => {
                      const line = q.items.find((qi) => qi.rfqItemId === item.id);
                      return (
                        <TableCell key={q.id} className="text-right">
                          {line ? formatMoney(line.unitPrice.toString()) : "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="text-muted-foreground">Delivery</TableCell>
                  {comparableQuotations.map((q) => (
                    <TableCell key={q.id} className="text-right text-muted-foreground">
                      {formatMoney(q.deliveryCost.toString())}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Tax</TableCell>
                  {comparableQuotations.map((q) => (
                    <TableCell key={q.id} className="text-right text-muted-foreground">
                      {formatMoney(q.taxAmount.toString())}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="border-t-2">
                  <TableCell className="font-semibold">Total</TableCell>
                  {comparableQuotations.map((q) => (
                    <TableCell
                      key={q.id}
                      className={cn(
                        "text-right font-semibold",
                        Number(q.total) === lowestTotal && "text-emerald-600",
                      )}
                    >
                      {formatMoney(q.total.toString())}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Status</TableCell>
                  {comparableQuotations.map((q) => (
                    <TableCell key={q.id} className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <StatusBadge status={q.status} />
                        {(q.status === "SUBMITTED" || q.status === "UNDER_REVIEW") &&
                          rfq.status !== "AWARDED" &&
                          rfq.status !== "CANCELLED" && (
                            <QuotationDecisionButtons quotationId={q.id} />
                          )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
