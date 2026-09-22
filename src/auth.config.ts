import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/forgot-password", "/reset-password"]);

/**
 * Edge-safe Auth.js config (no Prisma import here — this file is bundled
 * into middleware, which runs on the Edge runtime). The Credentials
 * provider (which touches the database) is added in ./auth.ts, used only
 * by Node.js API routes and server components.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic =
        PUBLIC_PATHS.has(nextUrl.pathname) || nextUrl.pathname.startsWith("/api/auth");
      if (isPublic) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
