"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AgentStatus } from "@prisma/client";
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

export function EditAgentDialog({
  agentId,
  agent,
}: {
  agentId: string;
  agent: {
    status: AgentStatus;
    phone: string | null;
    region: string | null;
    commissionRate: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    status: agent.status,
    phone: agent.phone ?? "",
    region: agent.region ?? "",
    commissionRate: agent.commissionRate ?? "",
    notes: agent.notes ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update agent.");
        return;
      }
      toast.success("Agent updated.");
      setOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit agent</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-status">Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v as AgentStatus)}>
              <SelectTrigger id="agent-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AgentStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {titleCase(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-phone">Phone</Label>
              <Input
                id="agent-phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-region">Region</Label>
              <Input
                id="agent-region"
                value={form.region}
                onChange={(e) => update("region", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-commission-rate">Commission rate (%)</Label>
            <Input
              id="agent-commission-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.commissionRate}
              onChange={(e) => update("commissionRate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-notes">Notes</Label>
            <Textarea
              id="agent-notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
