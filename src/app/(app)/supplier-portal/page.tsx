import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageSession, getUserOrganizations } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My quotations" };

export default async function SupplierPortalPage() {
  const session = await requirePageSession();
  const memberships = await getUserOrganizations(session.user.id);
  const organizationIds = memberships.map((m) => m.organizationId);

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: { in: organizationIds } },
  });
  const supplierIds = suppliers.map((s) => s.id);

  const invitations = await prisma.rfqSupplier.findMany({
    where: { supplierId: { in: supplierIds } },
    include: {
      rfq: { include: { project: { select: { name: true } } } },
      supplier: true,
    },
    orderBy: { invitedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="My quotations"
        description="RFQ invitations for your supplier account and their status."
      />

      {suppliers.length === 0 ? (
        <EmptyState
          title="No supplier account found"
          description="Register a supplier organization to receive RFQ invitations."
        />
      ) : invitations.length === 0 ? (
        <EmptyState title="No invitations yet" description="You'll see RFQ invitations here." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>RFQ</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <Link href={`/supplier-portal/${inv.rfqId}`} className="font-medium hover:underline">
                    {inv.rfq.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{inv.rfq.project.name}</TableCell>
                <TableCell>
                  <StatusBadge status={inv.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(inv.rfq.dueDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
