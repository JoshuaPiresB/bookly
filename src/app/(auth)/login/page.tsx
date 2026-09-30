import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getServerEnv } from "@/lib/env";

export const metadata = { title: "Entrar" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ cadastro?: string; senha?: string; error?: string }> }) {
  const { cadastro, senha, error } = await searchParams;
  const env = getServerEnv();
  return <>
    <p className="text-sm font-semibold text-brand">Bem-vindo de volta</p>
    <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">Entre na sua conta</h1>
    <p className="mb-8 mt-3 leading-7 text-muted">Continue organizando suas leituras e descobertas.</p>
    <LoginForm registered={cadastro === "sucesso"} passwordReset={senha === "redefinida"} oauthError={Boolean(error)} />
    <div className="my-7 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-line" /><span className="text-xs text-slate-400">NOVO NO BOOKLY?</span><span className="h-px flex-1 bg-line" /></div>
    <p className="text-center text-sm text-muted">Ainda não tem conta? <Link className="font-semibold text-brand underline-offset-4 hover:underline" href="/cadastro">Criar conta gratuitamente</Link></p>
    <GoogleSignInButton enabled={Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)} />
  </>;
}
