"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickAddCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/catalog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add category.");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit" variant="outline" disabled={isSubmitting}>
        Add
      </Button>
    </form>
  );
}

export function QuickAddUnitForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !abbreviation.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/catalog/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, abbreviation }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add unit.");
        return;
      }
      setName("");
      setAbbreviation("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input placeholder="Unit name (Bag)" value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        placeholder="Abbr. (bag)"
        className="w-28"
        value={abbreviation}
        onChange={(e) => setAbbreviation(e.target.value)}
      />
      <Button type="submit" variant="outline" disabled={isSubmitting}>
        Add
      </Button>
    </form>
  );
}
