import { prisma } from "@/lib/prisma";
import { SiteForm } from "@/components/projects/site-form";

export default async function ProjectSitePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const site = await prisma.site.findUnique({ where: { projectId } });

  return (
    <SiteForm
      projectId={projectId}
      site={
        site
          ? {
              parcelReference: site.parcelReference,
              location: site.location,
              areaValue: site.areaValue?.toString() ?? null,
              areaUnit: site.areaUnit,
              tenureType: site.tenureType,
              ownershipInfo: site.ownershipInfo,
              planningStatus: site.planningStatus,
              developmentNotes: site.developmentNotes,
              constraints: site.constraints,
            }
          : null
      }
    />
  );
}
