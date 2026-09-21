import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { MilestoneStatusControl } from "@/components/milestones/milestone-status-control";
import { MILESTONE_STATUS_TRANSITIONS } from "@/lib/validations/milestone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; milestoneId: string }>;
}) {
  const { projectId, milestoneId } = await params;

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { responsibleOrg: true, contract: { select: { id: true, title: true } } },
  });
  if (!milestone || milestone.projectId !== projectId) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={milestone.name}
        description={milestone.contract ? `Contract: ${milestone.contract.title}` : undefined}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={milestone.status} />
            <MilestoneStatusControl
              milestoneId={milestone.id}
              allowedTransitions={MILESTONE_STATUS_TRANSITIONS[milestone.status]}
            />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Planned date</p>
            <p>{formatDate(milestone.plannedDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Actual date</p>
            <p>{formatDate(milestone.actualDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">% of project</p>
            <p>{milestone.percentage !== null ? `${milestone.percentage}%` : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Responsible party</p>
            <p>{milestone.responsibleOrg?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Payment amount</p>
            <p>{milestone.paymentAmount ? formatMoney(milestone.paymentAmount.toString()) : "—"}</p>
          </div>
          {milestone.description && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap">{milestone.description}</p>
            </div>
          )}
          {milestone.notes && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{milestone.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
