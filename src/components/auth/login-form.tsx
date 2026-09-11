"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { loginSchema } from "@/features/auth/auth.schema";
import { AuthField } from "./auth-field";

export function LoginForm({ registered = false, passwordReset = false }: { registered?: boolean; passwordReset?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Confira os dados."); return; }
    sending.current = true;
    setPending(true);
    try {
      const result = await signIn("credentials", { ...parsed.data, redirect: false, callbackUrl: "/" });
      if (!result || result.error) {
        setError(result?.error === "RATE_LIMITED" ? "Muitas tentativas. Aguarde 15 minutos e tente novamente." : result?.error === "CredentialsSignin" ? "E-mail ou senha incorretos." : "Não foi possível entrar agora. Tente novamente em instantes.");
      } else { router.replace("/"); router.refresh(); }
    } catch { setError("Não foi possível conectar. Confira sua conexão e tente novamente."); }
    finally { sending.current = false; setPending(false); }
  }

  return <form onSubmit={submit} className="space-y-5" aria-busy={pending}>
    {registered && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Conta criada. Entre para continuar.</p>}
    {passwordReset && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Senha redefinida. Entre com a nova senha.</p>}
    <AuthField id="email" name="email" label="E-mail" type="email" autoComplete="email" maxLength={254} required disabled={pending} />
    <div>
      <AuthField id="password" name="password" label="Senha" type="password" autoComplete="current-password" required disabled={pending} />
      <div className="mt-2 text-right">
        <Link href="/esqueci-senha" className="text-sm font-medium text-brand underline-offset-4 hover:underline">Esqueci minha senha</Link>
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button className="primary-button w-full" type="submit" disabled={pending}>{pending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}{pending ? "Entrando…" : "Entrar"}</button>
  </form>;
}
