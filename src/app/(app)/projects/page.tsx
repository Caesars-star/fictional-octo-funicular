import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageSession, getUserOrganizations } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, titleCase } from "@/lib/utils";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await requirePageSession();
  const memberships = await getUserOrganizations(session.user.id);

  const projects = isPlatformAdmin(session.user.role)
    ? await prisma.project.findMany({
        include: { organization: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.project.findMany({
        where: { organizationId: { in: memberships.map((m) => m.organizationId) } },
        include: { organization: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });

  return (
    <div>
      <PageHeader
        title="Projects"
        description="What we're building, and everything coordinating it."
        actions={
          <CreateProjectDialog
            organizations={memberships.map((m) => ({ id: m.organizationId, name: m.organization.name }))}
          />
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking BOQs, procurement and progress."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <StatusBadge status={project.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{project.organization.name}</p>
                  <p>{titleCase(project.type)}</p>
                  {project.location && <p>{project.location}</p>}
                  {project.estimatedProjectValue && (
                    <p className="font-medium text-foreground">
                      {formatMoney(project.estimatedProjectValue.toString())}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
