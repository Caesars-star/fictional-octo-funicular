import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/session";
import { canAccessOrg } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { AddMemberDialog } from "@/components/organizations/add-member-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, titleCase } from "@/lib/utils";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const session = await requirePageSession();
  const { organizationId } = await params;

  if (!(await canAccessOrg(session.user, organizationId))) notFound();

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
      projects: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!organization) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={organization.name}
        description={`${titleCase(organization.type)} organization`}
        actions={<StatusBadge status={organization.verificationStatus} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {organization.projects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Projects created under this organization will appear here."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organization.projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.location ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Members</CardTitle>
            <AddMemberDialog organizationId={organization.id} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {organization.memberships.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">
                      {m.user.firstName} {m.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {titleCase(m.role)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Registration number</p>
            <p>{organization.registrationNumber ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{organization.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{organization.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p>{formatDate(organization.createdAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
