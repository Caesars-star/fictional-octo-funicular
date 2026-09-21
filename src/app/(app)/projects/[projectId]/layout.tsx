import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/session";
import { canAccessProject } from "@/lib/rbac";
import { StatusBadge } from "@/components/status-badge";
import { ProjectTabNav } from "@/components/projects/project-tab-nav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const session = await requirePageSession();
  const { projectId } = await params;

  if (!(await canAccessProject(session.user, projectId))) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, status: true, organization: { select: { name: true } } },
  });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{project.organization.name}</p>
      </div>
      <ProjectTabNav projectId={projectId} />
      {children}
    </div>
  );
}
