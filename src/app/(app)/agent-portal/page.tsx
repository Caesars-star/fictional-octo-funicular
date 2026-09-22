import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateLeadDialog } from "@/components/agents/create-lead-dialog";
import { LeadStatusControl } from "@/components/agents/lead-status-control";
import { LogActivityDialog } from "@/components/agents/log-activity-dialog";
import { LEAD_STATUS_TRANSITIONS } from "@/lib/validations/agent";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";

export const metadata = { title: "Agent portal" };

export default async function AgentPortalPage() {
  const session = await requirePageSession();

  const agent = await prisma.agent.findUnique({
    where: { userId: session.user.id },
    include: {
      organization: { select: { name: true } },
      leads: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" }, take: 50 },
      commissions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!agent) {
    return (
      <div>
        <PageHeader title="Agent portal" description="No agent profile found for your account." />
        <EmptyState
          title="No agent profile"
          description="Your account is not registered as a TARA field agent."
        />
      </div>
    );
  }

  const leadCounts = {
    total: agent.leads.length,
    converted: agent.leads.filter((l) => l.status === "CONVERTED").length,
  };
  const commissionTotal = agent.commissions
    .filter((c) => c.status !== "CANCELLED")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent portal"
        description={agent.organization ? `Field agent — ${agent.organization.name}` : "Field agent"}
        actions={<StatusBadge status={agent.status} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{leadCounts.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Converted</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{leadCounts.converted}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commissions (active)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(commissionTotal)}</CardContent>
        </Card>
      </div>

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
                <p className="text-sm text-muted-foreground">
                  No leads recorded yet — log a prospective developer, supplier, or contractor above.
                </p>
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
                <p className="text-sm text-muted-foreground">
                  No activity logged yet. This is an append-only record of your field work.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {agent.activities.map((activity) => (
                    <li key={activity.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
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
            <CardHeader>
              <CardTitle>Commissions</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.commissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No commissions recorded yet. Commissions are created and approved by your
                  organization&apos;s admins, never by you directly.
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
