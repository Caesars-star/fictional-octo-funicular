"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectTabNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { label: "Overview", href: base },
    { label: "Site", href: `${base}/site` },
    { label: "BOQ", href: `${base}/boq` },
    { label: "RFQs & Quotations", href: `${base}/rfqs` },
  ];

  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-4 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
