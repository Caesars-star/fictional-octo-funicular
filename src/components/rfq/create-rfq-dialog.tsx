"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";

interface BoqItemOption {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  estimatedTotalCost: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

export function CreateRfqDialog({
  projectId,
  boqItems,
  suppliers,
}: {
  projectId: string;
  boqItems: BoqItemOption[];
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedItems.size === 0) {
      toast.error("Select at least one BOQ item.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/rfqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          boqItemIds: Array.from(selectedItems),
          supplierIds: Array.from(selectedSuppliers),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to create RFQ.");
        return;
      }
      toast.success("RFQ created.");
      setOpen(false);
      router.push(`/projects/${projectId}/rfqs/${data.rfq.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={boqItems.length === 0}>New RFQ</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create RFQ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rfq-title">Title</Label>
            <Input
              id="rfq-title"
              required
              placeholder="e.g. Cement & steel — foundation works"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>BOQ items to request quotes for</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {boqItems.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggle(selectedItems, setSelectedItems, item.id)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1">
                    {item.description}{" "}
                    <span className="text-muted-foreground">
                      ({item.quantity} {item.unit})
                    </span>
                  </span>
                  <span className="text-muted-foreground">{formatMoney(item.estimatedTotalCost)}</span>
                </label>
              ))}
              {boqItems.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">
                  No un-procured BOQ items available.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Invite suppliers (optional now, can invite later)</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {suppliers.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.has(s.id)}
                    onChange={() => toggle(selectedSuppliers, setSelectedSuppliers, s.id)}
                    className="h-4 w-4"
                  />
                  <span>{s.name}</span>
                </label>
              ))}
              {suppliers.length === 0 && (
                <p className="p-2 text-sm text-muted-foreground">No suppliers registered yet.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create RFQ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
