"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";
import { forgotPasswordSchema } from "@/features/auth/auth.schema";
import { AuthField } from "./auth-field";

const responseSchema = z.object({ message: z.string() });
const errorSchema = z.object({
  error: z.object({
    message: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [success, setSuccess] = useState("");
  const sending = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;

    const form = event.currentTarget;
    setError("");
    setEmailError("");
    const parsed = forgotPasswordSchema.safeParse(
      Object.fromEntries(new FormData(form)),
    );
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Informe um e-mail válido.");
      const emailInput = form.elements.namedItem("email");
      if (emailInput instanceof HTMLInputElement) emailInput.focus();
      return;
    }

    sending.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const result = errorSchema.safeParse(body);
        if (result.success) {
          setError(result.data.error.message);
          setEmailError(result.data.error.fieldErrors?.email?.[0] ?? "");
        } else {
          setError("Não foi possível enviar o link agora. Tente novamente.");
        }
        return;
      }

      const result = responseSchema.safeParse(body);
      setSuccess(
        result.success
          ? result.data.message
          : "Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha.",
      );
      form.reset();
    } catch {
      setError("Não foi possível conectar. Confira sua conexão e tente novamente.");
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <p role="status" className="rounded-lg bg-green-50 p-4 text-sm leading-6 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          {success}
        </p>
        <p className="text-sm leading-6 text-muted">
          Confira também a caixa de spam. O link pode ser usado apenas uma vez.
        </p>
        <Link href="/login" className="primary-button w-full">
          Voltar para entrar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={pending}>
      <AuthField
        id="email"
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        maxLength={254}
        required
        error={emailError}
        disabled={pending}
      />
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <button type="submit" className="primary-button w-full" disabled={pending}>
        {pending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
        {pending ? "Enviando…" : "Enviar link"}
      </button>
      <Link
        href="/login"
        className="flex min-h-10 items-center justify-center text-sm font-medium text-brand underline-offset-4 hover:underline"
      >
        Voltar para entrar
      </Link>
    </form>
  );
}
