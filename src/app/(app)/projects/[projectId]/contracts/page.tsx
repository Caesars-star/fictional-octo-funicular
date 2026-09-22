import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CreateContractDialog } from "@/components/contracts/create-contract-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";

export default async function ProjectContractsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const contracts = await prisma.contract.findMany({
    where: { projectId },
    include: { parties: { include: { organization: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Agreements with contractors, suppliers and consultants on this project."
        actions={<CreateContractDialog projectId={projectId} />}
      />

      {contracts.length === 0 ? (
        <EmptyState
          title="No contracts yet"
          description="Create a contract to record an agreement with a contractor, supplier or consultant."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parties</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>End date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/projects/${projectId}/contracts/${c.id}`} className="font-medium hover:underline">
                    {c.title}
                  </Link>
                </TableCell>
                <TableCell>{titleCase(c.contractType)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.parties.map((p) => p.organization.name).join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-right">
                  {c.value ? formatMoney(c.value.toString()) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(c.endDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
