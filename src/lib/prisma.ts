import { PrismaClient } from "@prisma/client";

declare global {
  var __taraPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__taraPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__taraPrisma = prisma;
}
