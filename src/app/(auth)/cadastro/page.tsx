import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Criar conta" };
export default function RegisterPage() {
  return <>
    <p className="text-sm font-semibold text-brand">Comece sua jornada</p>
    <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">Crie sua conta</h1>
    <p className="mb-8 mt-3 leading-7 text-muted">Leva menos de um minuto para criar seu espaço de leitura.</p>
    <RegisterForm />
    <div className="my-7 h-px bg-line" aria-hidden="true" />
    <p className="text-center text-sm text-muted">Já faz parte do Bookly? <Link className="font-semibold text-brand underline-offset-4 hover:underline" href="/login">Entrar na minha conta</Link></p>
  </>;
}
