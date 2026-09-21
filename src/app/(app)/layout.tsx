import { requirePageSession } from "@/lib/session";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageSession();

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r bg-card md:block">
          <SidebarNav role={session.user.role} />
        </aside>
        <main className="flex-1 overflow-x-hidden bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}
