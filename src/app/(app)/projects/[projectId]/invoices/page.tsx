import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function ProjectInvoicesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [invoices, organizations, purchaseOrders, contracts, milestones] = await Promise.all([
    prisma.invoice.findMany({
      where: { projectId },
      include: { issuedByOrg: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.purchaseOrder.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.contract.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
    prisma.milestone.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Invoices received from suppliers and contractors, and their payment status."
        actions={
          <CreateInvoiceDialog
            projectId={projectId}
            organizations={organizations.map((o) => ({ id: o.id, label: o.name }))}
            purchaseOrders={purchaseOrders.map((po) => ({ id: po.id, label: po.poNumber }))}
            contracts={contracts.map((c) => ({ id: c.id, label: c.title }))}
            milestones={milestones.map((m) => ({ id: m.id, label: m.name }))}
          />
        }
      />

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices recorded yet"
          description="Record an invoice against a purchase order, contract or milestone as it comes in."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Issued by</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Due date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <Link
                    href={`/projects/${projectId}/invoices/${inv.id}`}
                    className="font-medium hover:underline"
                  >
                    {inv.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>{inv.issuedByOrg.name}</TableCell>
                <TableCell>
                  <StatusBadge status={inv.status} />
                </TableCell>
                <TableCell className="text-right">{formatMoney(inv.total.toString())}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
