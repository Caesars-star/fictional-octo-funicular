import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CreateMilestoneDialog } from "@/components/milestones/create-milestone-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function ProjectMilestonesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [milestones, organizations, contracts] = await Promise.all([
    prisma.milestone.findMany({
      where: { projectId },
      include: { responsibleOrg: { select: { name: true } } },
      orderBy: [{ plannedDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.contract.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Milestones"
        description="Planned progress checkpoints for this project."
        actions={
          <CreateMilestoneDialog
            projectId={projectId}
            organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
            contracts={contracts.map((c) => ({ id: c.id, title: c.title }))}
          />
        }
      />

      {milestones.length === 0 ? (
        <EmptyState
          title="No milestones yet"
          description="Add planned checkpoints like 'Foundation complete' or 'Roofing complete' to track progress."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Responsible party</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead className="text-right">Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Link
                    href={`/projects/${projectId}/milestones/${m.id}`}
                    className="font-medium hover:underline"
                  >
                    {m.name}
                  </Link>
                  {m.percentage !== null && (
                    <span className="ml-2 text-xs text-muted-foreground">{m.percentage}%</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{m.responsibleOrg?.name ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={m.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(m.plannedDate)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(m.actualDate)}</TableCell>
                <TableCell className="text-right">
                  {m.paymentAmount ? formatMoney(m.paymentAmount.toString()) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
