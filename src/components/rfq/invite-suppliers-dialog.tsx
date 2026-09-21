"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function InviteSuppliersDialog({
  rfqId,
  availableSuppliers,
}: {
  rfqId: string;
  availableSuppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/rfqs/${rfqId}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to invite suppliers.");
        return;
      }
      toast.success("Suppliers invited.");
      setOpen(false);
      setSelected(new Set());
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={availableSuppliers.length === 0}>
          Invite suppliers
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite suppliers</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
            {availableSuppliers.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4"
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || selected.size === 0}>
              {isSubmitting ? "Inviting…" : "Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
