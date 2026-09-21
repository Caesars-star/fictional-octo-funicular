"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatQuantity } from "@/lib/utils";

interface RfqItemRow {
  id: string;
  description: string;
  quantity: string;
  unit: string;
}

interface ExistingItem {
  rfqItemId: string;
  unitPrice: string;
}

export function QuotationForm({
  rfqId,
  supplierId,
  items,
  existing,
}: {
  rfqId: string;
  supplierId: string;
  items: RfqItemRow[];
  existing?: {
    prices: ExistingItem[];
    deliveryCost: string;
    taxAmount: string;
    notes: string | null;
    validUntil: string | null;
    status: string;
  } | null;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<"draft" | "submit" | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, existing?.prices.find((p) => p.rfqItemId === i.id)?.unitPrice ?? ""])),
  );
  const [deliveryCost, setDeliveryCost] = useState(existing?.deliveryCost ?? "0");
  const [taxAmount, setTaxAmount] = useState(existing?.taxAmount ?? "0");
  const [validUntil, setValidUntil] = useState(existing?.validUntil?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const quantityByItem = useMemo(() => Object.fromEntries(items.map((i) => [i.id, Number(i.quantity)])), [items]);

  const subtotal = items.reduce((sum, i) => {
    const price = Number(prices[i.id] || 0);
    return sum + price * quantityByItem[i.id];
  }, 0);
  const total = subtotal + Number(deliveryCost || 0) + Number(taxAmount || 0);

  const isLocked = existing?.status === "SUBMITTED" || existing?.status === "UNDER_REVIEW" || existing?.status === "ACCEPTED";

  async function handleSubmit(submit: boolean) {
    const missing = items.some((i) => !prices[i.id]);
    if (missing) {
      toast.error("Enter a price for every item.");
      return;
    }
    setIsSubmitting(submit ? "submit" : "draft");
    try {
      const res = await fetch(`/api/rfqs/${rfqId}/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          items: items.map((i) => ({ rfqItemId: i.id, unitPrice: prices[i.id] })),
          deliveryCost,
          taxAmount,
          validUntil: validUntil || undefined,
          notes,
          submit,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to save quotation.");
        return;
      }
      toast.success(submit ? "Quotation submitted." : "Draft saved.");
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isLocked ? "Your quotation" : "Submit quotation"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Unit price (KES)</TableHead>
              <TableHead className="text-right">Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{formatQuantity(item.quantity)}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={isLocked}
                    className="ml-auto w-32 text-right"
                    value={prices[item.id]}
                    onChange={(e) => setPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney((Number(prices[item.id] || 0) * quantityByItem[item.id]).toString())}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="delivery-cost">Delivery cost</Label>
            <Input
              id="delivery-cost"
              type="number"
              min="0"
              step="0.01"
              disabled={isLocked}
              value={deliveryCost}
              onChange={(e) => setDeliveryCost(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-amount">Tax</Label>
            <Input
              id="tax-amount"
              type="number"
              min="0"
              step="0.01"
              disabled={isLocked}
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valid-until">Valid until</Label>
            <Input
              id="valid-until"
              type="date"
              disabled={isLocked}
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quote-notes">Notes</Label>
          <Textarea id="quote-notes" disabled={isLocked} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">Total quotation value</span>
          <span className="text-lg font-semibold">{formatMoney(total.toString())}</span>
        </div>

        {!isLocked && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={!!isSubmitting} onClick={() => handleSubmit(false)}>
              {isSubmitting === "draft" ? "Saving…" : "Save draft"}
            </Button>
            <Button disabled={!!isSubmitting} onClick={() => handleSubmit(true)}>
              {isSubmitting === "submit" ? "Submitting…" : "Submit quotation"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
