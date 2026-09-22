"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { InvoiceStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/utils";

export function InvoiceStatusControl({
  invoiceId,
  allowedTransitions,
}: {
  invoiceId: string;
  allowedTransitions: InvoiceStatus[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<InvoiceStatus | null>(null);

  async function transitionTo(status: InvoiceStatus) {
    if (status === "DISPUTED" && !confirm("Mark this invoice as disputed?")) return;
    if (status === "APPROVED" && !confirm("Approve this invoice for payment?")) return;
    setIsSubmitting(status);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update invoice.");
        return;
      }
      toast.success(`Invoice marked ${titleCase(status)}.`);
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
