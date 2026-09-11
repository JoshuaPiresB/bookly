"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  resetPasswordSchema,
  resetTokenSchema,
} from "@/features/auth/auth.schema";
import { AuthField } from "./auth-field";

const errorSchema = z.object({
  error: z.object({
    message: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const sending = useRef(false);

  if (!resetTokenSchema.safeParse(token).success) {
    return (
      <div className="space-y-6">
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-800">
          Este link de redefinição é inválido ou está incompleto.
        </p>
        <Link href="/esqueci-senha" className="primary-button w-full">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;

    const form = event.currentTarget;
    setError("");
    setFields({});
    const parsed = resetPasswordSchema.safeParse({
      ...Object.fromEntries(new FormData(form)),
      token,
    });
    if (!parsed.success) {
      const nextFields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        nextFields[String(issue.path[0] ?? "form")] ??= issue.message;
      }
      setFields(nextFields);
      const first = parsed.error.issues[0]?.path[0];
      if (typeof first === "string") {
        (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
      }
      return;
    }

    sending.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const result = errorSchema.safeParse(await response.json());
        setError(
          result.success
            ? result.data.error.message
            : "Não foi possível redefinir a senha. Solicite um novo link.",
        );
        if (result.success && result.data.error.fieldErrors) {
          setFields(
            Object.fromEntries(
              Object.entries(result.data.error.fieldErrors).map(([key, messages]) => [
                key,
                messages[0] ?? "Campo inválido.",
              ]),
            ),
          );
        }
        return;
      }

      router.replace("/login?senha=redefinida");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Confira sua conexão e tente novamente.");
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={pending}>
      <div>
        <AuthField
          id="password"
          name="password"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          error={fields.password}
          disabled={pending}
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="mt-2 text-sm text-muted">
          Use pelo menos 10 caracteres.
        </p>
      </div>
      <AuthField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        required
        error={fields.confirmPassword}
        disabled={pending}
      />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" className="primary-button w-full" disabled={pending}>
        {pending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
        {pending ? "Salvando…" : "Redefinir senha"}
      </button>
    </form>
  );
}
