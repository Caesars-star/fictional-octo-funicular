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
import { formatQuantity } from "@/lib/utils";

interface PoItemOption {
  id: string;
  description: string;
  unit: string;
  outstandingQuantity: string;
}

export function RecordDeliveryDialog({
  purchaseOrderId,
  items,
}: {
  purchaseOrderId: string;
  items: PoItemOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [expectedDate, setExpectedDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const deliverableItems = items.filter((i) => Number(i.outstandingQuantity) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lines = deliverableItems
      .map((i) => ({ purchaseOrderItemId: i.id, quantity: quantities[i.id] }))
      .filter((l) => l.quantity && Number(l.quantity) > 0);

    if (lines.length === 0) {
      toast.error("Enter a quantity for at least one item.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-orders/${purchaseOrderId}/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines,
          expectedDate: expectedDate || undefined,
          location,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to record delivery.");
        return;
      }
      toast.success("Delivery recorded.");
      setOpen(false);
      setQuantities({});
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={deliverableItems.length === 0}>
          Record delivery
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record delivery</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Quantities delivered</Label>
            <div className="space-y-2 rounded-md border p-3">
              {deliverableItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1">{item.description}</span>
                  <span className="text-xs text-muted-foreground">
                    of {formatQuantity(item.outstandingQuantity)} {item.unit} remaining
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    max={item.outstandingQuantity}
                    className="w-28"
                    value={quantities[item.id] ?? ""}
                    onChange={(e) =>
                      setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-expected">Expected date</Label>
              <Input
                id="delivery-expected"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-location">Location</Label>
              <Input
                id="delivery-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery-notes">Notes</Label>
            <Textarea id="delivery-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording…" : "Record delivery"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
