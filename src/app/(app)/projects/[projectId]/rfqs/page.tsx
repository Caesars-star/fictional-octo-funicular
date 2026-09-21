import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CreateRfqDialog } from "@/components/rfq/create-rfq-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default async function ProjectRfqsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [rfqs, boqItems, suppliers] = await Promise.all([
    prisma.rfq.findMany({
      where: { projectId },
      include: { _count: { select: { rfqSuppliers: true, quotations: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.boqItem.findMany({
      where: { boq: { projectId }, procurementStatus: "NOT_STARTED" },
      orderBy: { sequence: "asc" },
    }),
    prisma.supplier.findMany({
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="RFQs & quotations"
        description="Request quotes from suppliers and compare what comes back."
        actions={
          <CreateRfqDialog
            projectId={projectId}
            boqItems={boqItems.map((i) => ({
              id: i.id,
              description: i.description,
              quantity: i.quantity.toString(),
              unit: i.unit,
              estimatedTotalCost: i.estimatedTotalCost.toString(),
            }))}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.organization.name }))}
          />
        }
      />

      {rfqs.length === 0 ? (
        <EmptyState
          title="No RFQs yet"
          description="Create an RFQ from your BOQ items to start collecting supplier quotations."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Suppliers invited</TableHead>
              <TableHead>Quotations</TableHead>
              <TableHead>Due date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfqs.map((rfq) => (
              <TableRow key={rfq.id}>
                <TableCell>
                  <Link href={`/projects/${projectId}/rfqs/${rfq.id}`} className="font-medium hover:underline">
                    {rfq.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={rfq.status} />
                </TableCell>
                <TableCell>{rfq._count.rfqSuppliers}</TableCell>
                <TableCell>{rfq._count.quotations}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(rfq.dueDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
