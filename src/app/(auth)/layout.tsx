import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, BookOpenCheck, Library, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/");
  return <main className="min-h-dvh bg-panel lg:grid lg:grid-cols-[minmax(420px,0.9fr)_minmax(600px,1.1fr)]">
    <aside className="relative hidden min-h-dvh overflow-hidden bg-[#071d3e] px-12 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
      <div aria-hidden="true" className="absolute -left-32 -top-28 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-40 -right-28 h-[30rem] w-[30rem] rounded-full bg-sky-400/15 blur-3xl" />
      <Link href="/" className="relative inline-flex w-fit items-center gap-3 text-2xl font-semibold tracking-tight">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><BookOpen size={25} className="text-blue-300" strokeWidth={1.8} aria-hidden="true" /></span>
        Bookly
      </Link>

      <div className="relative my-auto max-w-xl py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Sua vida de leitor em um só lugar</p>
        <h2 className="mt-5 font-serif text-4xl leading-tight tracking-[-0.025em] xl:text-5xl">Descubra histórias.<br />Organize leituras.<br />Guarde memórias.</h2>
        <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">Um espaço tranquilo para acompanhar os livros que você ama e tudo o que eles despertam em você.</p>

        <div className="mt-10 grid gap-3 xl:grid-cols-3">
          {[
            [Library, "Estantes", "Organize seus livros"],
            [BookOpenCheck, "Progresso", "Acompanhe leituras"],
            [Star, "Resenhas", "Registre impressões"],
          ].map(([Icon, title, description]) => {
            const ItemIcon = Icon as typeof Library;
            return <div key={String(title)} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
              <ItemIcon size={20} className="text-blue-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">{String(title)}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{String(description)}</p>
            </div>;
          })}
        </div>
      </div>

      <p className="relative text-xs text-slate-500">Bookly · Sua biblioteca digital</p>
    </aside>

    <section className="relative flex min-h-dvh flex-col bg-[radial-gradient(circle_at_top_right,_var(--bookly-auth-glow)_0,_var(--bookly-canvas)_34%,_var(--bookly-canvas)_100%)] px-4 py-4 sm:px-8 sm:py-6 lg:px-12 lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-ink"><ArrowLeft size={17} aria-hidden="true" />Voltar ao início</Link>
        <Link href="/" className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ink lg:hidden"><BookOpen size={23} className="text-brand" aria-hidden="true" />Bookly</Link>
      </div>

      <div className="my-auto flex justify-center py-7 sm:py-10">
        <div className="w-full max-w-[500px] rounded-[20px] border border-line bg-panel px-5 py-7 shadow-[0_20px_55px_rgba(2,8,23,0.16)] sm:rounded-[24px] sm:px-10 sm:py-10 xl:px-12">{children}</div>
      </div>
      <p className="text-center text-xs text-subtle">Um espaço seguro para organizar suas leituras.</p>
    </section>
  </main>;
}
