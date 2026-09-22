"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DeliveryStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/utils";

export function DeliveryStatusControl({
  deliveryId,
  allowedTransitions,
}: {
  deliveryId: string;
  allowedTransitions: DeliveryStatus[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<DeliveryStatus | null>(null);

  async function transitionTo(status: DeliveryStatus) {
    if (status === "DISPUTED" && !confirm("Mark this delivery as disputed?")) return;
    setIsSubmitting(status);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update delivery.");
        return;
      }
      toast.success(`Delivery marked ${titleCase(status)}.`);
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  if (allowedTransitions.length === 0) return null;

  return (
    <div className="flex gap-1">
      {allowedTransitions.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === "DISPUTED" ? "ghost" : "outline"}
          disabled={!!isSubmitting}
          onClick={() => transitionTo(status)}
        >
          {isSubmitting === status ? "Saving…" : titleCase(status)}
        </Button>
      ))}
    </div>
  );
}
