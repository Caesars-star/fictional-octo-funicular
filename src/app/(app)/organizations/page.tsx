import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CreateOrganizationDialog } from "@/components/organizations/create-organization-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { titleCase } from "@/lib/utils";

export const metadata = { title: "Organizations" };

export default async function OrganizationsPage() {
  const session = await requirePageSession();

  const organizations = isPlatformAdmin(session.user.role)
    ? await prisma.organization.findMany({
        include: { _count: { select: { projects: true, memberships: true } } },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.organization.findMany({
        where: { memberships: { some: { userId: session.user.id, status: "ACTIVE" } } },
        include: { _count: { select: { projects: true, memberships: true } } },
        orderBy: { createdAt: "desc" },
      });

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Companies and teams coordinating work on TARA."
        actions={<CreateOrganizationDialog />}
      />

      {organizations.length === 0 ? (
        <EmptyState
          title="No organizations yet"
          description="Create an organization to start managing projects, suppliers and contracts."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{org.name}</CardTitle>
                    <StatusBadge status={org.verificationStatus} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{titleCase(org.type)}</p>
                  <p>
                    {org._count.projects} project{org._count.projects === 1 ? "" : "s"} ·{" "}
                    {org._count.memberships} member{org._count.memberships === 1 ? "" : "s"}
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
