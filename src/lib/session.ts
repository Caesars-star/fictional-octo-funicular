import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Server-component helper: resolves the session or redirects to /login. */
export async function requirePageSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/** The organizations the current user belongs to, with their role in each. */
export async function getUserOrganizations(userId: string) {
  return prisma.organizationMembership.findMany({
    where: { userId, status: "ACTIVE" },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
}
