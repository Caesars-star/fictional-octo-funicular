import type { UserRole, UserStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    status: UserStatus;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
  }
}
