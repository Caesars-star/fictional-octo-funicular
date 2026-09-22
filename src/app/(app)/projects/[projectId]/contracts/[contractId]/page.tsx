import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { ContractStatusControl } from "@/components/contracts/contract-status-control";
import { AddContractPartyDialog } from "@/components/contracts/add-contract-party-dialog";
import { CONTRACT_STATUS_TRANSITIONS } from "@/lib/validations/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; contractId: string }>;
}) {
  const { projectId, contractId } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { parties: { include: { organization: true } } },
  });
  if (!contract || contract.projectId !== projectId) notFound();

  const allOrganizations = await prisma.organization.findMany({ orderBy: { name: "asc" } });
  const partyOrgIds = new Set(contract.parties.map((p) => p.organizationId));
  const availableOrganizations = allOrganizations
    .filter((o) => !partyOrgIds.has(o.id))
    .map((o) => ({ id: o.id, name: o.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={contract.title}
        description={titleCase(contract.contractType)}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={contract.status} />
            <ContractStatusControl
              contractId={contract.id}
              allowedTransitions={CONTRACT_STATUS_TRANSITIONS[contract.status]}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Value: </span>
              {contract.value ? formatMoney(contract.value.toString()) : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Start date: </span>
              {formatDate(contract.startDate)}
            </p>
            <p>
              <span className="text-muted-foreground">End date: </span>
              {formatDate(contract.endDate)}
            </p>
            {contract.obligations && (
              <div>
                <p className="text-muted-foreground">Obligations</p>
                <p className="whitespace-pre-wrap">{contract.obligations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Parties</CardTitle>
            <AddContractPartyDialog contractId={contract.id} organizations={availableOrganizations} />
          </CardHeader>
          <CardContent>
            {contract.parties.length === 0 ? (
              <EmptyState title="No parties added yet" />
            ) : (
              <ul className="space-y-2 text-sm">
                {contract.parties.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>{p.organization.name}</span>
                    <span className="text-xs font-medium text-muted-foreground">{titleCase(p.role)}</span>
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
