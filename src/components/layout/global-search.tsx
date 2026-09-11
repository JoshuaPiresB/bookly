import { Search } from "lucide-react";

export function GlobalSearch() {
  return <form role="search" action="/explorar" method="get" className="relative w-full max-w-[620px]">
    <label htmlFor="global-book-search" className="sr-only">Buscar livros, autores ou ISBN</label>
    <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
    <input id="global-book-search" name="q" placeholder="Buscar livros, autores ou ISBN" required minLength={2} maxLength={200} className="h-11 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm text-ink shadow-[0_1px_2px_rgba(15,23,42,0.02)] placeholder:text-slate-400 hover:border-slate-300" />
  </form>;
}
