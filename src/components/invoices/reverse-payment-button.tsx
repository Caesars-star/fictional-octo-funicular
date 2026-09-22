"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReversePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReverse() {
    if (!confirm("Reverse this payment? It will be kept on record as reversed.")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to reverse payment.");
        return;
      }
      toast.success("Payment reversed.");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button size="sm" variant="ghost" disabled={isSubmitting} onClick={handleReverse}>
      {isSubmitting ? "Reversing…" : "Reverse"}
    </Button>
  );
}
