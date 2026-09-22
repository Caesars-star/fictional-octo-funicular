import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageSession, getUserOrganizations } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { QuotationForm } from "@/components/rfq/quotation-form";

export default async function SupplierQuotePage({
  params,
}: {
  params: Promise<{ rfqId: string }>;
}) {
  const session = await requirePageSession();
  const { rfqId } = await params;

  const memberships = await getUserOrganizations(session.user.id);
  const organizationIds = memberships.map((m) => m.organizationId);

  const rfq = await prisma.rfq.findUnique({
    where: { id: rfqId },
    include: {
      items: true,
      project: { select: { name: true } },
      rfqSuppliers: {
        where: { supplier: { organizationId: { in: organizationIds } } },
        include: { supplier: true },
      },
    },
  });

  const invitation = rfq?.rfqSuppliers[0];
  if (!rfq || !invitation) notFound();

  const existingQuotation = await prisma.quotation.findUnique({
    where: { rfqId_supplierId: { rfqId, supplierId: invitation.supplierId } },
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={rfq.title}
        description={rfq.project.name}
        actions={<StatusBadge status={rfq.status} />}
      />
      <QuotationForm
        rfqId={rfq.id}
        supplierId={invitation.supplierId}
        items={rfq.items.map((i) => ({
          id: i.id,
          description: i.description,
          quantity: i.quantity.toString(),
          unit: i.unit,
        }))}
        existing={
          existingQuotation
            ? {
                prices: existingQuotation.items.map((it) => ({
                  rfqItemId: it.rfqItemId,
                  unitPrice: it.unitPrice.toString(),
                })),
                deliveryCost: existingQuotation.deliveryCost.toString(),
                taxAmount: existingQuotation.taxAmount.toString(),
                notes: existingQuotation.notes,
                validUntil: existingQuotation.validUntil?.toISOString() ?? null,
                status: existingQuotation.status,
              }
            : null
        }
      />
    </div>
  );
}
