import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { authenticateUser, registerUser } from "@/features/auth/auth.service";
import {
  requestPasswordReset,
  resetPassword,
} from "@/features/auth/password-reset.service";
import type { PasswordResetMail } from "@/features/auth/password-reset-mailer";
import { getDb } from "@/lib/db";

const db = getDb();
const runId = randomUUID();
const email = `reset-${runId}@test.bookly.local`;
const oldPassword = "Senha antiga segura 123!";
const newPassword = "Senha nova segura 456!";
let userId = "";

beforeAll(async () => {
  const user = await registerUser({
    name: "Leitor da recuperação",
    email,
    password: oldPassword,
    confirmPassword: oldPassword,
  });
  userId = user.id;
});

afterAll(async () => {
  if (userId) await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe("recuperação de senha", () => {
  it("não revela se o e-mail existe", async () => {
    const sendMail = vi.fn<(mail: PasswordResetMail) => Promise<void>>();
    await requestPasswordReset(
      { email: `ausente-${runId}@test.bookly.local` },
      sendMail,
    );
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("gera token com hash e redefine a senha uma única vez", async () => {
    let sent: PasswordResetMail | undefined;
    await requestPasswordReset({ email }, async (mail) => {
      sent = mail;
    });

    expect(sent?.to).toBe(email);
    const rawToken = new URL(sent?.resetUrl ?? "").searchParams.get("token");
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);

    const stored = await db.passwordResetToken.findUniqueOrThrow({
      where: { userId },
    });
    expect(stored.tokenHash).toBe(
      createHash("sha256").update(rawToken ?? "").digest("hex"),
    );
    expect(stored.tokenHash).not.toBe(rawToken);

    const sessionVersion = (
      await db.user.findUniqueOrThrow({ where: { id: userId } })
    ).sessionVersion;
    const resetInput = {
      token: rawToken,
      password: newPassword,
      confirmPassword: newPassword,
    };
    await resetPassword(resetInput);

    expect(await authenticateUser({ email, password: oldPassword })).toBeNull();
    expect(await authenticateUser({ email, password: newPassword })).toMatchObject({ id: userId });
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: userId } })).sessionVersion,
    ).toBe(sessionVersion + 1);
    expect(
      (await db.passwordResetToken.findUniqueOrThrow({ where: { userId } })).usedAt,
    ).toBeInstanceOf(Date);
    await expect(resetPassword(resetInput)).rejects.toMatchObject({
      code: "INVALID_RESET_TOKEN",
    });
  });

  it("recusa token expirado", async () => {
    const token = "b".repeat(64);
    const createdAt = new Date(Date.now() - 2 * 60_000);
    const expiresAt = new Date(Date.now() - 60_000);
    await db.passwordResetToken.upsert({
      where: { userId },
      create: {
        userId,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        createdAt,
        expiresAt,
      },
      update: {
        tokenHash: createHash("sha256").update(token).digest("hex"),
        createdAt,
        expiresAt,
        usedAt: null,
      },
    });
    await expect(
      resetPassword({ token, password: newPassword, confirmPassword: newPassword }),
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
  });
});
