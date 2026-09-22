"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ContractStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/utils";

export function ContractStatusControl({
  contractId,
  allowedTransitions,
}: {
  contractId: string;
  allowedTransitions: ContractStatus[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<ContractStatus | null>(null);

  async function transitionTo(status: ContractStatus) {
    if (
      (status === "TERMINATED" || status === "CANCELLED") &&
      !confirm(`Mark this contract as ${titleCase(status)}?`)
    )
      return;
    setIsSubmitting(status);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update contract.");
        return;
      }
      toast.success(`Contract marked ${titleCase(status)}.`);
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
          variant={status === "TERMINATED" || status === "CANCELLED" ? "ghost" : "outline"}
          disabled={!!isSubmitting}
          onClick={() => transitionTo(status)}
        >
          {isSubmitting === status ? "Saving…" : `Mark ${titleCase(status)}`}
        </Button>
      ))}
    </div>
  );
}
