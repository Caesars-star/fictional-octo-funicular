"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_OPTIONS = [
  { value: "DEVELOPER", label: "Developer — I create and manage projects" },
  { value: "PROJECT_MANAGER", label: "Project Manager — I run project operations" },
  { value: "SUPPLIER", label: "Supplier — I supply materials" },
  { value: "CONTRACTOR", label: "Contractor — I deliver contracted work" },
  { value: "CONSULTANT", label: "Consultant — I provide professional services" },
  { value: "AGENT", label: "Agent — I recruit and support participants" },
  { value: "HOMEOWNER", label: "Homeowner — I'm building my own home" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: "",
    organizationName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.role) {
      setError("Please select what best describes you.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Unable to register. Please check your details.");
        return;
      }

      const signInResult = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your TARA account"
      description="Set up your organization and start coordinating projects."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              required
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              required
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">I am a…</Label>
          <Select value={form.role} onValueChange={(v) => update("role", v)}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizationName">Organization name</Label>
          <Input
            id="organizationName"
            required
            placeholder="e.g. Acme Developments Ltd"
            value={form.organizationName}
            onChange={(e) => update("organizationName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
