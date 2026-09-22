"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CreatePurchaseOrderButton({
  quotationId,
  projectId,
}: {
  quotationId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/purchase-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to create purchase order.");
        return;
      }
      toast.success(`Purchase order ${data.purchaseOrder.poNumber} created.`);
      router.push(`/projects/${projectId}/purchase-orders/${data.purchaseOrder.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button size="sm" variant="outline" disabled={isSubmitting} onClick={handleCreate}>
      {isSubmitting ? "Creating…" : "Create PO"}
    </Button>
  );
}
