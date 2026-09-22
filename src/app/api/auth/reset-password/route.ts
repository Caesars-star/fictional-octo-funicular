import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";

const BCRYPT_COST_FACTOR = 12;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new ApiError(400, "This password reset link is invalid or has expired.");
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await logAudit({
      actorId: resetToken.userId,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: resetToken.userId,
    });

    return NextResponse.json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    return handleApiError(error);
  }
}
