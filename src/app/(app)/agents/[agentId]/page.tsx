import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/session";
import { canAccessAgent, canOverseeAgent } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateLeadDialog } from "@/components/agents/create-lead-dialog";
import { LeadStatusControl } from "@/components/agents/lead-status-control";
import { LogActivityDialog } from "@/components/agents/log-activity-dialog";
import { CreateCommissionDialog } from "@/components/agents/create-commission-dialog";
import { CommissionStatusControl } from "@/components/agents/commission-status-control";
import { EditAgentDialog } from "@/components/agents/edit-agent-dialog";
import { LEAD_STATUS_TRANSITIONS } from "@/lib/validations/agent";
import { COMMISSION_STATUS_TRANSITIONS } from "@/lib/validations/commission";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const session = await requirePageSession();
  const user = { id: session.user.id, role: session.user.role };

  const [hasAccess, hasOversight] = await Promise.all([
    canAccessAgent(user, agentId),
    canOverseeAgent(user, agentId),
  ]);
  if (!hasAccess) notFound();

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      organization: { select: { name: true } },
      leads: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" }, take: 50 },
      commissions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!agent) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${agent.user.firstName} ${agent.user.lastName}`}
        description={agent.organization ? agent.organization.name : agent.user.email}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={agent.status} />
            {hasOversight && (
              <EditAgentDialog
                agentId={agent.id}
                agent={{
                  status: agent.status,
                  phone: agent.phone,
                  region: agent.region,
                  commissionRate: agent.commissionRate?.toString() ?? null,
                  notes: agent.notes,
                }}
              />
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{agent.user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{agent.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Region</p>
            <p>{agent.region ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Commission rate</p>
            <p>{agent.commissionRate ? `${agent.commissionRate.toString()}%` : "—"}</p>
          </div>
          {agent.notes && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{agent.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Leads</CardTitle>
              <CreateLeadDialog agentId={agent.id} />
            </CardHeader>
            <CardContent>
              {agent.leads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recorded</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.organizationName}</TableCell>
                        <TableCell className="text-muted-foreground">{titleCase(lead.type)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {lead.contactName || lead.contactPhone || lead.contactEmail || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(lead.createdAt)}
                        </TableCell>
                        <TableCell>
                          <LeadStatusControl
                            leadId={lead.id}
                            allowedTransitions={LEAD_STATUS_TRANSITIONS[lead.status]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Activities</CardTitle>
              <LogActivityDialog
                agentId={agent.id}
                leads={agent.leads.map((l) => ({ id: l.id, organizationName: l.organizationName }))}
              />
            </CardHeader>
            <CardContent>
              {agent.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity logged yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {agent.activities.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-start justify-between gap-4 border-b pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{titleCase(activity.type)}</p>
                        <p className="text-muted-foreground">{activity.description}</p>
                      </div>
                      <span className="shrink-0 text-muted-foreground">
                        {formatDate(activity.occurredAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Commissions</CardTitle>
              {hasOversight && (
                <CreateCommissionDialog
                  agentId={agent.id}
                  leads={agent.leads.map((l) => ({ id: l.id, organizationName: l.organizationName }))}
                />
              )}
            </CardHeader>
            <CardContent>
              {agent.commissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No commissions recorded yet.
                  {!hasOversight &&
                    " Commissions are created and approved by this agent's organization admins."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recorded</TableHead>
                      {hasOversight && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.commissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{titleCase(c.sourceType)}</TableCell>
                        <TableCell className="text-muted-foreground">{c.description || "—"}</TableCell>
                        <TableCell>{formatMoney(c.amount.toString())}</TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(c.createdAt)}
                        </TableCell>
                        {hasOversight && (
                          <TableCell>
                            <CommissionStatusControl
                              commissionId={c.id}
                              allowedTransitions={COMMISSION_STATUS_TRANSITIONS[c.status]}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
