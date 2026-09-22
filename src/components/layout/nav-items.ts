import type { UserRole } from "@prisma/client";

export interface NavItem {
  label: string;
  href: string;
  /** Roles allowed to see this item. Omit to show to everyone. */
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/projects" },
  { label: "Organizations", href: "/organizations" },
  { label: "Material catalog", href: "/catalog" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Agents", href: "/agents" },
  {
    label: "My quotations",
    href: "/supplier-portal",
    roles: ["SUPPLIER", "PLATFORM_ADMIN"],
  },
  {
    label: "Agent portal",
    href: "/agent-portal",
    roles: ["AGENT", "PLATFORM_ADMIN"],
  },
];

export function visibleNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
