import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-primary">TARA</span>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-center">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            The construction transaction operating system
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            TARA coordinates projects, BOQs, procurement, suppliers and contracts across the
            Kenyan construction value chain — one traceable record from requirement to delivery.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Get started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </main>
      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        TARA — Kenya-focused construction sector economic infrastructure.
      </footer>
    </div>
  );
}
