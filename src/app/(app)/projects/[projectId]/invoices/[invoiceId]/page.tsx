import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { InvoiceStatusControl } from "@/components/invoices/invoice-status-control";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { ReversePaymentButton } from "@/components/invoices/reverse-payment-button";
import { INVOICE_STATUS_TRANSITIONS, PAYABLE_INVOICE_STATUSES } from "@/lib/validations/invoice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";
import { sumDecimal } from "@/lib/money";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; invoiceId: string }>;
}) {
  const { projectId, invoiceId } = await params;

  const [invoice, organizations] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        issuedByOrg: true,
        purchaseOrder: { select: { id: true, poNumber: true } },
        contract: { select: { id: true, title: true } },
        milestone: { select: { id: true, name: true } },
        payments: {
          include: { payerOrg: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!invoice || invoice.projectId !== projectId) notFound();

  const paid = sumDecimal(
    invoice.payments.filter((p) => p.status === "RECORDED").map((p) => p.amount),
  );
  const outstanding = invoice.total.sub(paid);
  const isPayable = PAYABLE_INVOICE_STATUSES.includes(invoice.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceNumber}
        description={invoice.issuedByOrg.name}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={invoice.status} />
            <InvoiceStatusControl
              invoiceId={invoice.id}
              allowedTransitions={INVOICE_STATUS_TRANSITIONS[invoice.status]}
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
              <span className="text-muted-foreground">Subtotal: </span>
              {formatMoney(invoice.subtotal.toString())}
            </p>
            <p>
              <span className="text-muted-foreground">Tax: </span>
              {formatMoney(invoice.taxAmount.toString())}
            </p>
            <p>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-medium">{formatMoney(invoice.total.toString())}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Paid: </span>
              {formatMoney(paid.toString())}
            </p>
            <p>
              <span className="text-muted-foreground">Outstanding: </span>
              {formatMoney(outstanding.toString())}
            </p>
            <p>
              <span className="text-muted-foreground">Due date: </span>
              {formatDate(invoice.dueDate)}
            </p>
            {invoice.purchaseOrder && (
              <p>
                <span className="text-muted-foreground">Purchase order: </span>
                <Link
                  href={`/projects/${projectId}/purchase-orders/${invoice.purchaseOrder.id}`}
                  className="text-primary hover:underline"
                >
                  {invoice.purchaseOrder.poNumber}
                </Link>
              </p>
            )}
            {invoice.contract && (
              <p>
                <span className="text-muted-foreground">Contract: </span>
                <Link
                  href={`/projects/${projectId}/contracts/${invoice.contract.id}`}
                  className="text-primary hover:underline"
                >
                  {invoice.contract.title}
                </Link>
              </p>
            )}
            {invoice.milestone && (
              <p>
                <span className="text-muted-foreground">Milestone: </span>
                <Link
                  href={`/projects/${projectId}/milestones/${invoice.milestone.id}`}
                  className="text-primary hover:underline"
                >
                  {invoice.milestone.name}
                </Link>
              </p>
            )}
            {invoice.notes && (
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Payments</CardTitle>
            {isPayable && (
              <RecordPaymentDialog
                invoiceId={invoice.id}
                organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
                maxAmount={outstanding.toString()}
              />
            )}
          </CardHeader>
          <CardContent>
            {invoice.payments.length === 0 ? (
              <EmptyState
                title="No payments recorded yet"
                description="Payment records here are transaction evidence — TARA does not move money."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Paid by</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">{formatDate(p.paymentDate)}</TableCell>
                      <TableCell>{p.payerOrg.name}</TableCell>
                      <TableCell className="text-muted-foreground">{titleCase(p.paymentMethod)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.reference ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatMoney(p.amount.toString())}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "RECORDED" && <ReversePaymentButton paymentId={p.id} />}
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
