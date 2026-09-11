import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";

type AuthRateLimitScope = "login" | "register" | "forgot-password" | "reset-password";

export async function consumeAuthAttempt(scope: AuthRateLimitScope, identifier: string) {
  const key = `${scope}:${createHash("sha256").update(identifier).digest("hex")}`;
  const db = getDb();
  const rows = await db.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "expiresAt")
    VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW() THEN 1 ELSE "AuthRateLimit"."attempts" + 1 END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "attempts"`;
  if ((rows[0]?.attempts ?? Infinity) > 10) {
    throw new AppError("RATE_LIMITED", "Muitas tentativas. Aguarde 15 minutos e tente novamente.", 429);
  }
  // Remoção limitada a entradas expiradas, nunca afeta um bloqueio ativo.
  await db.authRateLimit.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
}
