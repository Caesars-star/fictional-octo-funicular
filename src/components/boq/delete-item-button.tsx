"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteItemButton({ boqId, itemId }: { boqId: string; itemId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this BOQ item? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/boqs/${boqId}/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Unable to delete item.");
        return;
      }
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" disabled={isDeleting} onClick={handleDelete}>
      <Trash2 className="h-4 w-4 text-destructive" />
      <span className="sr-only">Delete item</span>
    </Button>
  );
}
