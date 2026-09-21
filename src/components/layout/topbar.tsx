"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials, titleCase } from "@/lib/utils";

export function Topbar() {
  const { data: session } = useSession();
  const user = session?.user;
  const [firstName = "", lastName = ""] = (user?.name ?? "").split(" ");

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-primary">
        TARA
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent">
          <Avatar className="h-7 w-7">
            <AvatarFallback>{initials(firstName, lastName)}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user?.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user?.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user?.role ? titleCase(user.role) : ""}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
