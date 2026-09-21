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

export function CreateMilestoneDialog({
  projectId,
  organizations,
  contracts,
}: {
  projectId: string;
  organizations: { id: string; name: string }[];
  contracts: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    plannedDate: "",
    percentage: "",
    responsibleOrgId: NONE,
    contractId: NONE,
    paymentAmount: "",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          percentage: form.percentage ? Number(form.percentage) : undefined,
          responsibleOrgId: form.responsibleOrgId === NONE ? undefined : form.responsibleOrgId,
          contractId: form.contractId === NONE ? undefined : form.contractId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to create milestone.");
        return;
      }
      toast.success("Milestone created.");
      setOpen(false);
      router.push(`/projects/${projectId}/milestones/${data.milestone.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New milestone</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create milestone</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milestone-name">Name</Label>
            <Input
              id="milestone-name"
              required
              placeholder="e.g. Foundation complete"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-planned">Planned date</Label>
              <Input
                id="milestone-planned"
                type="date"
                value={form.plannedDate}
                onChange={(e) => update("plannedDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-percentage">% of project</Label>
              <Input
                id="milestone-percentage"
                type="number"
                min="0"
                max="100"
                value={form.percentage}
                onChange={(e) => update("percentage", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-contract">Contract (optional)</Label>
            <Select value={form.contractId} onValueChange={(v) => update("contractId", v)}>
              <SelectTrigger id="milestone-contract">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-org">Responsible party (optional)</Label>
            <Select value={form.responsibleOrgId} onValueChange={(v) => update("responsibleOrgId", v)}>
              <SelectTrigger id="milestone-org">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-payment">Payment amount (KES, optional)</Label>
            <Input
              id="milestone-payment"
              type="number"
              min="0"
              step="0.01"
              value={form.paymentAmount}
              onChange={(e) => update("paymentAmount", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea
              id="milestone-description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
