"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function QuotationDecisionButtons({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<"ACCEPTED" | "REJECTED" | null>(null);

  async function decide(status: "ACCEPTED" | "REJECTED") {
    if (status === "ACCEPTED" && !confirm("Accept this quotation and award the RFQ?")) return;
    setIsSubmitting(status);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update quotation.");
        return;
      }
      toast.success(status === "ACCEPTED" ? "Quotation accepted." : "Quotation rejected.");
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={!!isSubmitting}
        onClick={() => decide("ACCEPTED")}
      >
        Accept
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={!!isSubmitting}
        onClick={() => decide("REJECTED")}
      >
        Reject
      </Button>
    </div>
  );
}
