"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ORG_TYPES = [
  "DEVELOPER",
  "SUPPLIER",
  "CONTRACTOR",
  "CONSULTANT",
  "AGENT_NETWORK",
  "OTHER",
] as const;

export function CreateOrganizationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("DEVELOPER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to create organization.");
        return;
      }
      toast.success("Organization created.");
      setOpen(false);
      setName("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New organization</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input id="org-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="org-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
