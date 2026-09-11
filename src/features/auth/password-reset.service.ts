import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { hashPassword } from "./password";
import { sendPasswordResetEmail, type PasswordResetMail } from "./password-reset-mailer";
import { forgotPasswordSchema, resetPasswordSchema } from "./auth.schema";
import { consumeAuthAttempt } from "./rate-limit";

export const PASSWORD_RESET_REQUEST_MESSAGE =
  "Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha.";

const INVALID_TOKEN_MESSAGE =
  "Este link de redefinição é inválido ou expirou. Solicite um novo link.";

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(
  input: unknown,
  sendMail: (mail: PasswordResetMail) => Promise<void> = sendPasswordResetEmail,
) {
  const { email } = forgotPasswordSchema.parse(input);
  await consumeAuthAttempt("forgot-password", email);

  const db = getDb();
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(
    Date.now() + getServerEnv().PASSWORD_RESET_TTL_MINUTES * 60_000,
  );
  const record = await db.passwordResetToken.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tokenHash, expiresAt },
    update: { tokenHash, expiresAt, usedAt: null, createdAt: new Date() },
    select: { id: true },
  });

  const resetUrl = new URL("/redefinir-senha", getServerEnv().NEXTAUTH_URL);
  resetUrl.searchParams.set("token", token);

  try {
    await sendMail({
      to: user.email,
      resetUrl: resetUrl.toString(),
      idempotencyKey: `password-reset-${record.id}-${tokenHash.slice(0, 16)}`,
    });
  } catch (error) {
    // A resposta permanece indistinguível para impedir enumeração de contas.
    console.error(
      "[Bookly] Falha ao enviar redefinição de senha:",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}

export async function resetPassword(input: unknown) {
  const data = resetPasswordSchema.parse(input);
  const tokenHash = hashResetToken(data.token.toLowerCase());
  await consumeAuthAttempt("reset-password", tokenHash);

  const passwordHash = await hashPassword(data.password);
  const now = new Date();

  await getDb().$transaction(async (tx) => {
    const token = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!token || token.usedAt || token.expiresAt <= now) {
      throw new AppError("INVALID_RESET_TOKEN", INVALID_TOKEN_MESSAGE, 400);
    }

    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) {
      throw new AppError("INVALID_RESET_TOKEN", INVALID_TOKEN_MESSAGE, 400);
    }

    await tx.user.update({
      where: { id: token.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
  });
}
