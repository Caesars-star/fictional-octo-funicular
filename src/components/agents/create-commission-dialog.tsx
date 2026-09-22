"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CommissionSourceType } from "@prisma/client";
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
import { titleCase } from "@/lib/utils";

const NONE = "__none__";

export function CreateCommissionDialog({
  agentId,
  leads,
}: {
  agentId: string;
  leads: { id: string; organizationName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    sourceType: CommissionSourceType.LEAD_CONVERSION as CommissionSourceType,
    leadId: NONE,
    amount: "",
    description: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/commissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: form.sourceType,
          leadId: form.leadId === NONE ? undefined : form.leadId,
          amount: form.amount,
          description: form.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to create commission.");
        return;
      }
      toast.success("Commission recorded.");
      setOpen(false);
      setForm({ sourceType: CommissionSourceType.LEAD_CONVERSION, leadId: NONE, amount: "", description: "" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New commission</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a commission</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commission-source">Source</Label>
            <Select
              value={form.sourceType}
              onValueChange={(v) => update("sourceType", v as CommissionSourceType)}
            >
              <SelectTrigger id="commission-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CommissionSourceType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {titleCase(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {leads.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="commission-lead">Related lead (optional)</Label>
              <Select value={form.leadId} onValueChange={(v) => update("leadId", v)}>
                <SelectTrigger id="commission-lead">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.organizationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="commission-amount">Amount (KES)</Label>
            <Input
              id="commission-amount"
              type="number"
              required
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commission-description">Description</Label>
            <Textarea
              id="commission-description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Record commission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
