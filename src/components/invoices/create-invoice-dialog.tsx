"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none__";

interface Option {
  id: string;
  label: string;
}

export function CreateInvoiceDialog({
  projectId,
  organizations,
  purchaseOrders,
  contracts,
  milestones,
  trigger,
  defaults,
  onCreated,
}: {
  projectId: string;
  organizations: Option[];
  purchaseOrders: Option[];
  contracts: Option[];
  milestones: Option[];
  trigger?: React.ReactNode;
  defaults?: Partial<{
    issuedByOrgId: string;
    purchaseOrderId: string;
    contractId: string;
    milestoneId: string;
    subtotal: string;
  }>;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    issuedByOrgId: defaults?.issuedByOrgId ?? organizations[0]?.id ?? "",
    purchaseOrderId: defaults?.purchaseOrderId ?? NONE,
    contractId: defaults?.contractId ?? NONE,
    milestoneId: defaults?.milestoneId ?? NONE,
    invoiceNumber: "",
    dueDate: "",
    subtotal: defaults?.subtotal ?? "",
    taxAmount: "0",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const total = (Number(form.subtotal || 0) + Number(form.taxAmount || 0)).toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.issuedByOrgId) {
      toast.error("Select who issued this invoice.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          purchaseOrderId: form.purchaseOrderId === NONE ? undefined : form.purchaseOrderId,
          contractId: form.contractId === NONE ? undefined : form.contractId,
          milestoneId: form.milestoneId === NONE ? undefined : form.milestoneId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to create invoice.");
        return;
      }
      toast.success("Invoice recorded.");
      setOpen(false);
      onCreated?.();
      router.push(`/projects/${projectId}/invoices/${data.invoice.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button>Record invoice</Button>}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice-org">Issued by</Label>
            <Select value={form.issuedByOrgId} onValueChange={(v) => update("issuedByOrgId", v)}>
              <SelectTrigger id="invoice-org">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-number">Invoice number</Label>
            <Input
              id="invoice-number"
              required
              placeholder="e.g. JHS-2026-0458"
              value={form.invoiceNumber}
              onChange={(e) => update("invoiceNumber", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The number as it appears on the invoice this organization sent.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="invoice-po">Purchase order</Label>
              <Select value={form.purchaseOrderId} onValueChange={(v) => update("purchaseOrderId", v)}>
                <SelectTrigger id="invoice-po">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-contract">Contract</Label>
              <Select value={form.contractId} onValueChange={(v) => update("contractId", v)}>
                <SelectTrigger id="invoice-contract">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-milestone">Milestone</Label>
              <Select value={form.milestoneId} onValueChange={(v) => update("milestoneId", v)}>
                <SelectTrigger id="invoice-milestone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {milestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-subtotal">Subtotal (KES)</Label>
              <Input
                id="invoice-subtotal"
                type="number"
                required
                min="0"
                step="0.01"
                value={form.subtotal}
                onChange={(e) => update("subtotal", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-tax">Tax (KES)</Label>
              <Input
                id="invoice-tax"
                type="number"
                min="0"
                step="0.01"
                value={form.taxAmount}
                onChange={(e) => update("taxAmount", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-due">Due date</Label>
              <Input
                id="invoice-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{total}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="invoice-notes">Notes</Label>
            <Textarea id="invoice-notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording…" : "Record invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
