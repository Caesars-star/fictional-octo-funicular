"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TENURE_TYPES = ["FREEHOLD", "LEASEHOLD", "COMMUNITY", "UNKNOWN"];
const PLANNING_STATUSES = ["NOT_APPLIED", "APPLIED", "APPROVED", "REJECTED"];

interface SiteData {
  parcelReference: string | null;
  location: string | null;
  areaValue: string | null;
  areaUnit: string | null;
  tenureType: string;
  ownershipInfo: string | null;
  planningStatus: string;
  developmentNotes: string | null;
  constraints: string | null;
}

export function SiteForm({ projectId, site }: { projectId: string; site: SiteData | null }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    parcelReference: site?.parcelReference ?? "",
    location: site?.location ?? "",
    areaValue: site?.areaValue ?? "",
    areaUnit: site?.areaUnit ?? "",
    tenureType: site?.tenureType ?? "UNKNOWN",
    ownershipInfo: site?.ownershipInfo ?? "",
    planningStatus: site?.planningStatus ?? "NOT_APPLIED",
    developmentNotes: site?.developmentNotes ?? "",
    constraints: site?.constraints ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/site`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to save site details.");
        return;
      }
      toast.success("Site details saved.");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site / land information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="parcelReference">Parcel reference</Label>
              <Input
                id="parcelReference"
                value={form.parcelReference}
                onChange={(e) => update("parcelReference", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => update("location", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="areaValue">Area</Label>
              <Input
                id="areaValue"
                type="number"
                step="0.01"
                value={form.areaValue}
                onChange={(e) => update("areaValue", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="areaUnit">Area unit</Label>
              <Input
                id="areaUnit"
                placeholder="acres, hectares…"
                value={form.areaUnit}
                onChange={(e) => update("areaUnit", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenureType">Tenure</Label>
              <Select value={form.tenureType} onValueChange={(v) => update("tenureType", v)}>
                <SelectTrigger id="tenureType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENURE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planningStatus">Planning status</Label>
              <Select value={form.planningStatus} onValueChange={(v) => update("planningStatus", v)}>
                <SelectTrigger id="planningStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANNING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownershipInfo">Ownership information</Label>
            <Textarea
              id="ownershipInfo"
              value={form.ownershipInfo}
              onChange={(e) => update("ownershipInfo", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="developmentNotes">Development notes</Label>
            <Textarea
              id="developmentNotes"
              value={form.developmentNotes}
              onChange={(e) => update("developmentNotes", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="constraints">Constraints</Label>
            <Textarea
              id="constraints"
              value={form.constraints}
              onChange={(e) => update("constraints", e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save site details"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
