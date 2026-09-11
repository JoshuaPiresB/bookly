import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Redefinir senha" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <h1 className="font-serif text-3xl font-medium">Crie uma nova senha</h1>
      <p className="mb-7 mt-3 text-sm leading-6 text-muted">
        Escolha uma senha segura que você ainda não utiliza em outros serviços.
      </p>
      <ResetPasswordForm token={typeof token === "string" ? token : ""} />
    </>
  );
}
