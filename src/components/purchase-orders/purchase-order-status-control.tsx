"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PoStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/utils";

export function PurchaseOrderStatusControl({
  purchaseOrderId,
  allowedTransitions,
}: {
  purchaseOrderId: string;
  allowedTransitions: PoStatus[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<PoStatus | null>(null);

  async function transitionTo(status: PoStatus) {
    if (status === "CANCELLED" && !confirm("Cancel this purchase order?")) return;
    setIsSubmitting(status);
    try {
      const res = await fetch(`/api/purchase-orders/${purchaseOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update purchase order.");
        return;
      }
      toast.success(`Purchase order marked ${titleCase(status)}.`);
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  if (allowedTransitions.length === 0) return null;

  return (
    <div className="flex gap-2">
      {allowedTransitions.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === "CANCELLED" ? "ghost" : "outline"}
          disabled={!!isSubmitting}
          onClick={() => transitionTo(status)}
        >
          {isSubmitting === status ? "Saving…" : `Mark ${titleCase(status)}`}
        </Button>
      ))}
    </div>
  );
}
