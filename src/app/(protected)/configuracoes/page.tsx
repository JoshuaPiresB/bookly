import type { Metadata } from "next";
import { requireUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const user = await requireUser();
  return <div className="max-w-3xl pb-8"><h1 className="font-serif text-[2rem] tracking-[-0.02em] sm:text-4xl">Configurações</h1><section className="surface mt-7 p-6" aria-labelledby="profile-heading"><h2 id="profile-heading" className="font-serif text-xl font-semibold">Perfil</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-muted">Nome</dt><dd className="mt-1 break-words font-medium">{user.name}</dd></div><div><dt className="text-sm text-muted">E-mail</dt><dd className="mt-1 break-all font-medium">{user.email}</dd></div></dl></section></div>;
}
