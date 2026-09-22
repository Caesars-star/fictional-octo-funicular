"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { LeadStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/utils";

export function LeadStatusControl({
  leadId,
  allowedTransitions,
}: {
  leadId: string;
  allowedTransitions: LeadStatus[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<LeadStatus | null>(null);

  async function transitionTo(status: LeadStatus) {
    if (status === "LOST" && !confirm("Mark this lead as lost?")) return;
    setIsSubmitting(status);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update lead.");
        return;
      }
      toast.success(`Lead marked ${titleCase(status)}.`);
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
          variant={status === "LOST" ? "ghost" : "outline"}
          disabled={!!isSubmitting}
          onClick={() => transitionTo(status)}
        >
          {isSubmitting === status ? "Saving…" : `Mark ${titleCase(status)}`}
        </Button>
      ))}
    </div>
  );
}
