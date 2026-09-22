import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CreateBoqButton } from "@/components/boq/create-boq-button";
import { AddSectionForm } from "@/components/boq/add-section-form";
import { AddBoqItemDialog } from "@/components/boq/add-boq-item-dialog";
import { DeleteItemButton } from "@/components/boq/delete-item-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatMoney, formatQuantity } from "@/lib/utils";
import { sumDecimal } from "@/lib/money";

export default async function ProjectBoqPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const boq = await prisma.boq.findFirst({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    include: {
      sections: {
        orderBy: { sequence: "asc" },
        include: { items: { orderBy: { sequence: "asc" } } },
      },
    },
  });

  if (!boq) {
    return (
      <EmptyState
        title="No bill of quantities yet"
        description="Create a BOQ to start breaking this project down into priced line items."
        action={<CreateBoqButton projectId={projectId} />}
      />
    );
  }

  const grandTotal = sumDecimal(boq.sections.flatMap((s) => s.items.map((i) => i.estimatedTotalCost)));

  return (
    <div className="space-y-6">
      <PageHeader
        title={boq.title}
        description={`${boq.sections.reduce((n, s) => n + s.items.length, 0)} line items`}
        actions={<StatusBadge status={boq.status} />}
      />

      {boq.sections.map((section) => {
        const sectionTotal = sumDecimal(section.items.map((i) => i.estimatedTotalCost));
        return (
          <div key={section.id} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-medium">{section.name}</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{formatMoney(sectionTotal.toString())}</span>
                <AddBoqItemDialog boqId={boq.id} boqSectionId={section.id} />
              </div>
            </div>
            {section.items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No items in this section yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                    <TableHead>Procurement</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{formatQuantity(item.quantity.toString())}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(item.estimatedUnitCost.toString())}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(item.estimatedTotalCost.toString())}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.procurementStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <AddBoqItemDialog
                            boqId={boq.id}
                            boqSectionId={section.id}
                            item={{
                              id: item.id,
                              description: item.description,
                              quantity: item.quantity.toString(),
                              unit: item.unit,
                              estimatedUnitCost: item.estimatedUnitCost.toString(),
                            }}
                            trigger={
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            }
                          />
                          <DeleteItemButton boqId={boq.id} itemId={item.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}

      <AddSectionForm boqId={boq.id} />

      <div className="flex items-center justify-end gap-3 rounded-lg border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground">BOQ total</span>
        <span className="text-lg font-semibold">{formatMoney(grandTotal.toString())}</span>
      </div>
    </div>
  );
}
