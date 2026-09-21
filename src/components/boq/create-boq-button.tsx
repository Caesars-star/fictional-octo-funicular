"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CreateBoqButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/boqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Bill of Quantities" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to create BOQ.");
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button onClick={handleCreate} disabled={isSubmitting}>
      {isSubmitting ? "Creating…" : "Create BOQ"}
    </Button>
  );
}
