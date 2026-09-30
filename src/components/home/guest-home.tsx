"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookMarked, BookOpenCheck, Library, Search, Star } from "lucide-react";
import { useLoginRequired } from "@/components/auth/login-required-provider";

const features = [
  {
    icon: Library,
    title: "Sua biblioteca, do seu jeito",
    description: "Crie estantes para organizar os livros que fazem parte da sua história.",
  },
  {
    icon: BookOpenCheck,
    title: "Acompanhe cada leitura",
    description: "Registre seu progresso e retome o livro exatamente de onde parou.",
  },
  {
    icon: Star,
    title: "Guarde suas impressões",
    description: "Escreva resenhas e anotações para lembrar do que cada obra despertou.",
  },
];

export function GuestHome() {
  const router = useRouter();
  const { requireLogin } = useLoginRequired();

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (query.length >= 2) router.push(`/explorar?q=${encodeURIComponent(query)}`);
  }

  return <div className="space-y-10 pb-8 sm:space-y-12 sm:pb-10">
    <section className="relative overflow-hidden rounded-2xl border border-info-line bg-panel shadow-[0_14px_45px_rgba(2,8,23,0.10)] sm:rounded-[28px] sm:shadow-[0_18px_60px_rgba(2,8,23,0.12)]">
      <div aria-hidden="true" className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-info/65 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-44 left-1/3 h-80 w-80 rounded-full bg-info/60 blur-3xl" />

      <div className="relative grid items-center gap-10 px-5 py-8 sm:min-h-[430px] sm:px-10 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-14 lg:py-14 xl:gap-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-info-line bg-info px-3.5 py-1.5 text-sm font-semibold text-brand">
            <BookMarked size={16} aria-hidden="true" />Sua próxima leitura começa aqui
          </div>
          <h1 className="mt-5 max-w-3xl font-serif text-[2.15rem] leading-[1.1] tracking-[-0.035em] text-ink sm:mt-6 sm:text-5xl xl:text-[3.5rem]">
            Descubra livros e construa sua história como leitor.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:mt-5 sm:text-lg sm:leading-8">
            Encontre livros por título, autor ou ISBN. Entre na sua conta para organizar estantes, acompanhar leituras e guardar suas melhores descobertas.
          </p>

          <form role="search" onSubmit={search} className="mt-7 flex max-w-2xl flex-col gap-3 sm:mt-8 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Pesquisar livros na página inicial</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-subtle" size={20} />
              <input name="q" required minLength={2} maxLength={200} placeholder="Busque por título, autor ou ISBN" className="h-13 w-full rounded-xl border border-line bg-panel pl-12 pr-4 text-sm text-ink shadow-[0_8px_30px_rgba(2,8,23,0.14)] placeholder:text-subtle hover:border-strong focus:border-brand" />
            </label>
            <button className="primary-button h-13 px-6">Pesquisar livros<ArrowRight size={17} aria-hidden="true" /></button>
          </form>
          <p className="mt-3 text-xs text-muted">A pesquisa é livre e não exige cadastro.</p>
        </div>

        <div className="relative mx-auto hidden w-full max-w-[430px] lg:block" aria-label="Como o Bookly ajuda a organizar suas leituras">
          <div className="absolute inset-x-10 inset-y-5 rotate-3 rounded-[26px] bg-info/70" aria-hidden="true" />
          <div className="relative rounded-[26px] border border-info-line bg-panel/95 p-6 shadow-[0_24px_70px_rgba(2,8,23,0.22)] backdrop-blur">
            <div className="flex items-center gap-3 border-b border-line pb-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white"><Library size={21} aria-hidden="true" /></span>
              <div><p className="font-serif text-xl font-semibold">Seu espaço de leitura</p><p className="mt-0.5 text-sm text-muted">Tudo organizado em um só lugar</p></div>
            </div>
            <ol className="mt-5 space-y-3">
              {[
                [Search, "Encontre", "Pesquise entre milhares de livros"],
                [BookMarked, "Organize", "Separe o que quer ler e seus favoritos"],
                [BookOpenCheck, "Acompanhe", "Registre o progresso de cada leitura"],
              ].map(([Icon, title, description], index) => {
                const StepIcon = Icon as typeof Search;
                return <li key={String(title)} className="flex items-center gap-4 rounded-2xl border border-line bg-hover/70 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel text-brand shadow-sm"><StepIcon size={19} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-ink">{String(title)}</p><span className="text-xs font-semibold text-subtle">0{index + 1}</span></div><p className="mt-0.5 text-sm text-muted">{String(description)}</p></div>
                </li>;
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="guest-features">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-brand">Feito para quem ama livros</p>
        <h2 id="guest-features" className="mt-2 font-serif text-3xl tracking-[-0.02em] text-ink sm:text-4xl">Mais do que uma lista de leituras</h2>
        <p className="mt-3 leading-7 text-muted">Crie uma conta gratuita para liberar todas as ferramentas do seu espaço pessoal.</p>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => <button key={title} type="button" onClick={requireLogin} className="group rounded-2xl border border-line bg-panel p-5 text-left shadow-[0_8px_30px_rgba(2,8,23,0.08)] transition-all hover:-translate-y-0.5 hover:border-info-line hover:shadow-[0_14px_38px_rgba(2,8,23,0.14)] focus-visible:border-brand sm:p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-info text-brand transition-colors group-hover:bg-brand group-hover:text-white"><Icon size={21} aria-hidden="true" /></span>
          <h3 className="mt-5 font-serif text-xl font-semibold text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-muted md:min-h-14">{description}</p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand">Conhecer recurso<ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></span>
        </button>)}
      </div>
    </section>
  </div>;
}
