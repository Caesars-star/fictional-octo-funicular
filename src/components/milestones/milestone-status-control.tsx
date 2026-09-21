"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MilestoneStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/utils";

export function MilestoneStatusControl({
  milestoneId,
  allowedTransitions,
}: {
  milestoneId: string;
  allowedTransitions: MilestoneStatus[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<MilestoneStatus | null>(null);

  async function transitionTo(status: MilestoneStatus) {
    if (status === "CANCELLED" && !confirm("Cancel this milestone?")) return;
    setIsSubmitting(status);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update milestone.");
        return;
      }
      toast.success(`Milestone marked ${titleCase(status)}.`);
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
