import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const kes = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
});

export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return kes.format(0);
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return kes.format(0);
  return kes.format(n);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(d);
}

export function formatQuantity(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 3 }).format(n);
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
