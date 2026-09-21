import { Badge, type BadgeProps } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";

const POSITIVE = new Set([
  "ACTIVE",
  "VERIFIED",
  "APPROVED",
  "ACCEPTED",
  "PAID",
  "DELIVERED",
  "COMPLETED",
  "AWARDED",
  "OPERATIONAL",
  "OPEN",
]);
const WARNING = new Set([
  "PENDING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "PARTIALLY_DELIVERED",
  "PARTIALLY_PAID",
  "IN_TRANSIT",
  "QUOTED",
  "RFQ_SENT",
  "INVITED",
  "VIEWED",
  "PROCUREMENT",
  "CONSTRUCTION",
]);
const NEGATIVE = new Set([
  "REJECTED",
  "CANCELLED",
  "SUSPENDED",
  "DISPUTED",
  "EXPIRED",
  "DECLINED",
  "REMOVED",
]);

function variantFor(status: string): BadgeProps["variant"] {
  if (POSITIVE.has(status)) return "success";
  if (WARNING.has(status)) return "warning";
  if (NEGATIVE.has(status)) return "destructive";
  return "secondary";
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={variantFor(status)}>{titleCase(status)}</Badge>;
}
