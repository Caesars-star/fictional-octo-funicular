import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Agents" };

export default async function AgentsPage() {
  const session = await requirePageSession();
  const admin = isPlatformAdmin(session.user.role);

  let organizationIds: string[] = [];
  if (!admin) {
    const overseeing = await prisma.organizationMembership.findMany({
      where: { userId: session.user.id, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
      select: { organizationId: true },
    });
    organizationIds = overseeing.map((m) => m.organizationId);
  }

  const agents = await prisma.agent.findMany({
    where: admin ? undefined : { organizationId: { in: organizationIds } },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      organization: { select: { name: true } },
      _count: { select: { leads: true, commissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Agents"
        description="TARA's human field network — recruiting participants, generating leads, and performing assigned verification work."
      />

      {agents.length === 0 ? (
        <EmptyState
          title="No agents in view"
          description={
            admin
              ? "No agents have registered yet."
              : "You don't have oversight of any agent network organizations."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {agent.user.firstName} {agent.user.lastName}
                    </CardTitle>
                    <StatusBadge status={agent.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{agent.organization?.name ?? "No organization"}</p>
                  <p>{agent.region ?? "Region not set"}</p>
                  <p>
                    {agent._count.leads} lead{agent._count.leads === 1 ? "" : "s"} ·{" "}
                    {agent._count.commissions} commission{agent._count.commissions === 1 ? "" : "s"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
