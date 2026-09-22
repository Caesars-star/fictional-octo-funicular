import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { MilestoneStatusControl } from "@/components/milestones/milestone-status-control";
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog";
import { MILESTONE_STATUS_TRANSITIONS } from "@/lib/validations/milestone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; milestoneId: string }>;
}) {
  const { projectId, milestoneId } = await params;

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      responsibleOrg: true,
      contract: { select: { id: true, title: true } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!milestone || milestone.projectId !== projectId) notFound();

  const canInvoice = milestone.status === "VERIFIED" && milestone.responsibleOrgId;

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

      {(canInvoice || milestone.invoices.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Invoices</CardTitle>
            {canInvoice && (
              <CreateInvoiceDialog
                projectId={projectId}
                organizations={milestone.responsibleOrg ? [{ id: milestone.responsibleOrg.id, label: milestone.responsibleOrg.name }] : []}
                purchaseOrders={[]}
                contracts={milestone.contract ? [{ id: milestone.contract.id, label: milestone.contract.title }] : []}
                milestones={[{ id: milestone.id, label: milestone.name }]}
                defaults={{
                  issuedByOrgId: milestone.responsibleOrgId ?? undefined,
                  milestoneId: milestone.id,
                  contractId: milestone.contractId ?? undefined,
                  subtotal: milestone.paymentAmount?.toString(),
                }}
                trigger={<Button size="sm">Create invoice</Button>}
              />
            )}
          </CardHeader>
          <CardContent>
            {milestone.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This milestone is verified — record the contractor&apos;s invoice against it.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {milestone.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between">
                    <Link
                      href={`/projects/${projectId}/invoices/${inv.id}`}
                      className="font-medium hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{formatMoney(inv.total.toString())}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
