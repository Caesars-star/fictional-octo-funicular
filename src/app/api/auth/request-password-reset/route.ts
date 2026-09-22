import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestPasswordResetSchema } from "@/lib/validations/auth";
import { handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = requestPasswordResetSchema.parse(body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return the same generic response, whether or not the account
    // exists — do not let this endpoint be used to enumerate registered emails.
    if (user) {
      const token = randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;

      // NOTE: no transactional email provider is wired up yet. In production
      // this must send `resetUrl` via email instead of logging it. Logged
      // here so the reset flow is verifiable end-to-end in development.
      console.log(`[password-reset] ${email} -> ${resetUrl}`);

      await logAudit({
        actorId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "User",
        entityId: user.id,
      });
    }

    return NextResponse.json({
      message: "If an account exists for that email, a reset link has been generated.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
