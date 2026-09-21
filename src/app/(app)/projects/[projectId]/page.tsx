import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";
import { sumDecimal } from "@/lib/money";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [project, boqCount, rfqCount, purchaseOrders, contractCount, openMilestoneCount, upcomingMilestones] =
    await Promise.all([
      prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        include: { site: true },
      }),
      prisma.boq.count({ where: { projectId } }),
      prisma.rfq.count({ where: { projectId } }),
      prisma.purchaseOrder.findMany({
        where: { projectId, status: { notIn: ["CANCELLED"] } },
        select: { total: true },
      }),
      prisma.contract.count({ where: { projectId } }),
      prisma.milestone.count({ where: { projectId, status: { notIn: ["VERIFIED", "CANCELLED"] } } }),
      prisma.milestone.findMany({
        where: { projectId, status: { notIn: ["VERIFIED", "CANCELLED"] } },
        orderBy: { plannedDate: "asc" },
        take: 5,
      }),
    ]);

  const committedCost = sumDecimal(purchaseOrders.map((po) => po.total));

  const stats = [
    { label: "Estimated project value", value: formatMoney(project.estimatedProjectValue?.toString()) },
    {
      label: "Estimated construction cost",
      value: formatMoney(project.estimatedConstructionCost?.toString()),
    },
    { label: "Committed cost (POs)", value: formatMoney(committedCost.toString()) },
    { label: "BOQs", value: boqCount },
    { label: "RFQs", value: rfqCount },
    { label: "Contracts", value: contractCount },
    { label: "Open milestones", value: openMilestoneCount },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p>{titleCase(project.type)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p>{titleCase(project.status)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Location</p>
              <p>{project.location ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Land reference</p>
              <p>{project.landReference ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Start date</p>
              <p>{formatDate(project.startDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expected completion</p>
              <p>{formatDate(project.expectedCompletion)}</p>
            </div>
            {project.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {project.site ? (
              <>
                <p>
                  <span className="text-muted-foreground">Parcel: </span>
                  {project.site.parcelReference ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Area: </span>
                  {project.site.areaValue ? `${project.site.areaValue} ${project.site.areaUnit ?? ""}` : "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Tenure: </span>
                  {titleCase(project.site.tenureType)}
                </p>
                <p>
                  <span className="text-muted-foreground">Planning status: </span>
                  {titleCase(project.site.planningStatus)}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No site information recorded yet.</p>
            )}
            <Link href={`/projects/${projectId}/site`} className="inline-block text-primary hover:underline">
              {project.site ? "Edit site details" : "Add site details"} →
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open milestones.{" "}
                <Link href={`/projects/${projectId}/milestones`} className="text-primary hover:underline">
                  Add one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y">
                {upcomingMilestones.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                    <Link
                      href={`/projects/${projectId}/milestones/${m.id}`}
                      className="font-medium hover:underline"
                    >
                      {m.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {m.plannedDate ? formatDate(m.plannedDate) : "No date set"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
