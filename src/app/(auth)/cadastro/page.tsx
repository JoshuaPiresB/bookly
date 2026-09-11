import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Criar conta" };
export default function RegisterPage() {
  return <><h1 className="mb-7 font-serif text-3xl font-medium">Crie sua conta</h1><RegisterForm /><p className="mt-7 text-center text-sm text-muted">Já tem conta? <Link className="font-medium text-brand underline-offset-4 hover:underline" href="/login">Entrar</Link></p></>;
}
