import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageSession, getUserOrganizations } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requirePageSession();
  const memberships = await getUserOrganizations(session.user.id);
  const organizationIds = memberships.map((m) => m.organizationId);

  const projectWhere = isPlatformAdmin(session.user.role)
    ? {}
    : { organizationId: { in: organizationIds } };

  const [projects, openRfqCount, pendingQuotationCount] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.rfq.count({ where: { project: projectWhere, status: "OPEN" } }),
    prisma.quotation.count({
      where: { rfq: { project: projectWhere }, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    }),
  ]);

  const totalEstimatedValue = projects.reduce(
    (sum, p) => sum + Number(p.estimatedProjectValue ?? 0),
    0,
  );

  const stats = [
    { label: "Active projects", value: projects.length },
    { label: "Estimated portfolio value", value: formatMoney(totalEstimatedValue.toString()) },
    { label: "Open RFQs", value: openRfqCount },
    { label: "Quotations awaiting review", value: pendingQuotationCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${session.user.name?.split(" ")[0] ?? ""}`}
        description="Here's what's happening across your projects."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Create your first project to start tracking BOQs, procurement and progress."
              action={
                <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
                  Go to projects →
                </Link>
              }
            />
          ) : (
            <div className="divide-y">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-accent/40"
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.organization.name}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
