"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { z } from "zod";
import { registerSchema } from "@/features/auth/auth.schema";
import { AuthField } from "./auth-field";

const errorSchema = z.object({ error: z.object({ message: z.string(), fieldErrors: z.record(z.string(), z.array(z.string())).optional() }) });

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const sending = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget;
    setError(""); setFields({});
    const parsed = registerSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
      setFields(errors);
      const first = parsed.error.issues[0]?.path[0];
      if (typeof first === "string") (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
      return;
    }
    sending.current = true; setPending(true);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (!response.ok) {
        const result = errorSchema.safeParse(await response.json());
        setError(result.success ? result.data.error.message : "Não foi possível criar sua conta. Tente novamente.");
        if (result.success && result.data.error.fieldErrors) setFields(Object.fromEntries(Object.entries(result.data.error.fieldErrors).map(([key, messages]) => [key, messages[0] ?? "Campo inválido."])));
        return;
      }
      router.replace("/login?cadastro=sucesso");
    } catch { setError("Não foi possível conectar. Confira sua conexão e tente novamente."); }
    finally { sending.current = false; setPending(false); }
  }

  return <form onSubmit={submit} noValidate className="space-y-5" aria-busy={pending}>
    <AuthField id="name" name="name" label="Nome" autoComplete="name" maxLength={80} required error={fields.name} disabled={pending} />
    <AuthField id="email" name="email" label="E-mail" type="email" autoComplete="email" maxLength={254} required error={fields.email} disabled={pending} />
    <div><AuthField id="password" name="password" label="Senha" type="password" autoComplete="new-password" required error={fields.password} disabled={pending} aria-describedby="password-hint" /><p id="password-hint" className="mt-2 text-sm text-muted">Use pelo menos 10 caracteres.</p></div>
    <AuthField id="confirmPassword" name="confirmPassword" label="Confirmar senha" type="password" autoComplete="new-password" required error={fields.confirmPassword} disabled={pending} />
    <div aria-live="polite">{error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}</div>
    <button type="submit" className="primary-button min-h-[52px] w-full rounded-xl shadow-[0_10px_24px_rgba(18,104,207,0.20)]" disabled={pending}>{pending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}{pending ? "Criando conta…" : "Criar conta"}</button>
  </form>;
}
