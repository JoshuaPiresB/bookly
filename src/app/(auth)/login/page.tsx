import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Entrar" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ cadastro?: string; senha?: string }> }) {
  const { cadastro, senha } = await searchParams;
  return <><h1 className="mb-7 font-serif text-3xl font-medium">Entre na sua conta</h1><LoginForm registered={cadastro === "sucesso"} passwordReset={senha === "redefinida"} /><p className="mt-7 text-center text-sm text-muted">Ainda não tem conta? <Link className="font-medium text-brand underline-offset-4 hover:underline" href="/cadastro">Criar conta</Link></p></>;
}
