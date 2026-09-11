import "server-only";

import { getServerEnv } from "@/lib/env";

export type PasswordResetMail = {
  to: string;
  resetUrl: string;
  idempotencyKey: string;
};

function emailHtml(resetUrl: string) {
  const safeUrl = resetUrl.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

  return `
    <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0b1f44">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7edf4;border-radius:14px;padding:32px">
        <p style="margin:0 0 24px;color:#1473e6;font-size:22px;font-weight:700">Bookly</p>
        <h1 style="margin:0 0 16px;font-size:24px">Redefina sua senha</h1>
        <p style="margin:0 0 24px;line-height:1.6;color:#475569">Recebemos uma solicitação para redefinir a senha da sua conta. O link expira em breve e pode ser usado uma única vez.</p>
        <a href="${safeUrl}" style="display:inline-block;border-radius:10px;background:#1268cf;color:#ffffff;padding:14px 20px;text-decoration:none;font-weight:600">Criar nova senha</a>
        <p style="margin:24px 0 0;line-height:1.6;color:#64748b;font-size:14px">Se você não solicitou a alteração, ignore este e-mail. Sua senha continuará a mesma.</p>
      </div>
    </div>`;
}

export async function sendPasswordResetEmail(mail: PasswordResetMail) {
  const env = getServerEnv();

  if (!env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Bookly] Link de redefinição (somente desenvolvimento): ${mail.resetUrl}`);
      return;
    }
    throw new Error("PASSWORD_RESET_EMAIL_NOT_CONFIGURED");
  }

  if (!env.RESEND_FROM) throw new Error("PASSWORD_RESET_SENDER_NOT_CONFIGURED");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": mail.idempotencyKey,
      "User-Agent": "Bookly/0.1.0",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [mail.to],
      subject: "Redefina sua senha no Bookly",
      html: emailHtml(mail.resetUrl),
      text: `Redefina sua senha no Bookly: ${mail.resetUrl}\n\nSe você não solicitou esta alteração, ignore este e-mail.`,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`PASSWORD_RESET_EMAIL_FAILED_${response.status}`);
  }
}
