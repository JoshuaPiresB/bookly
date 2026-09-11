import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-serif text-3xl font-medium">Esqueci minha senha</h1>
      <p className="mb-7 mt-3 text-sm leading-6 text-muted">
        Informe seu e-mail para receber um link de redefinição.
      </p>
      <ForgotPasswordForm />
      <p className="mt-7 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link className="font-medium text-brand underline-offset-4 hover:underline" href="/cadastro">
          Criar conta
        </Link>
      </p>
    </>
  );
}
