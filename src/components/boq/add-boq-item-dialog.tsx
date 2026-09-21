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

interface BoqItemInput {
  description: string;
  quantity: string;
  unit: string;
  estimatedUnitCost: string;
}

export function AddBoqItemDialog({
  boqId,
  boqSectionId,
  item,
  trigger,
}: {
  boqId: string;
  boqSectionId: string;
  item?: (BoqItemInput & { id: string }) | null;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<BoqItemInput>({
    description: item?.description ?? "",
    quantity: item?.quantity ?? "",
    unit: item?.unit ?? "",
    estimatedUnitCost: item?.estimatedUnitCost ?? "",
  });

  function update<K extends keyof BoqItemInput>(key: K, value: BoqItemInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = item ? `/api/boqs/${boqId}/items/${item.id}` : `/api/boqs/${boqId}/items`;
      const method = item ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item ? form : { ...form, boqSectionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to save item.");
        return;
      }
      toast.success(item ? "Item updated." : "Item added.");
      setOpen(false);
      if (!item) setForm({ description: "", quantity: "", unit: "", estimatedUnitCost: "" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const lineTotal =
    form.quantity && form.estimatedUnitCost
      ? (Number(form.quantity) * Number(form.estimatedUnitCost)).toLocaleString("en-KE", {
          style: "currency",
          currency: "KES",
        })
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            Add item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit BOQ item" : "Add BOQ item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-description">Description</Label>
            <Input
              id="item-description"
              required
              placeholder="e.g. Portland cement 50kg"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-quantity">Quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                required
                min="0.001"
                step="0.001"
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-unit">Unit</Label>
              <Input
                id="item-unit"
                required
                placeholder="bags, m3, kg…"
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-unit-cost">Unit cost (KES)</Label>
              <Input
                id="item-unit-cost"
                type="number"
                required
                min="0"
                step="0.01"
                value={form.estimatedUnitCost}
                onChange={(e) => update("estimatedUnitCost", e.target.value)}
              />
            </div>
          </div>
          {lineTotal && (
            <p className="text-sm text-muted-foreground">
              Line total: <span className="font-medium text-foreground">{lineTotal}</span>
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : item ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
