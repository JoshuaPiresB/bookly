import type { Metadata } from "next";
import { BookOpenText, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/current-user";
import { ThemeSelector } from "@/components/theme/theme-selector";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const user = await requireUser();
  return <div className="max-w-3xl pb-8">
    <h1 className="font-serif text-[2rem] tracking-[-0.02em] sm:text-4xl">Configurações</h1>

    <section className="surface mt-6 p-5 sm:mt-7 sm:p-6" aria-labelledby="profile-heading">
      <h2 id="profile-heading" className="font-serif text-xl font-semibold">Perfil</h2>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        <div><dt className="text-sm text-muted">Nome</dt><dd className="mt-1 break-words font-medium">{user.name}</dd></div>
        <div><dt className="text-sm text-muted">E-mail</dt><dd className="mt-1 break-all font-medium">{user.email}</dd></div>
      </dl>
    </section>

    <section className="surface mt-4 p-5 sm:p-6" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" className="font-serif text-xl font-semibold">Aparência</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Escolha como o Bookly deve aparecer neste dispositivo.</p>
      <ThemeSelector />
    </section>

    <section className="surface mt-4 p-5 sm:p-6" aria-labelledby="help-heading">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-brand">
            <BookOpenText size={21} aria-hidden="true" />
          </span>
          <div>
            <h2 id="help-heading" className="font-serif text-xl font-semibold">Ajuda e documentação</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Consulte o manual completo para aprender a pesquisar livros, organizar estantes, acompanhar leituras e usar todos os recursos do Bookly.
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-muted">PDF · 12 páginas</p>
          </div>
        </div>
        <a
          href="/documentos/manual-do-usuario-bookly.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="secondary-button w-full shrink-0 sm:w-auto"
          aria-label="Abrir o Manual de uso do Bookly em PDF em uma nova aba"
        >
          Abrir manual
          <ExternalLink size={17} aria-hidden="true" />
        </a>
      </div>
    </section>
  </div>;
}
