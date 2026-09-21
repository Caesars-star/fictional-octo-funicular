import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

/** A user-facing API error with a deliberate HTTP status and safe message. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Converts any thrown error into a safe JSON response. Never leaks raw
 * database/internal error text to the client; logs the technical detail
 * server-side instead.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request data.", issues: error.flatten() },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("[api] prisma error", error.code, error.message);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with these details already exists." },
        { status: 409 },
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "This action references a record that does not exist or is invalid." },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to complete this request." }, { status: 500 });
  }

  console.error("[api] unhandled error", error);
  return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
}
