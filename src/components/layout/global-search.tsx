"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function GlobalSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") ?? "";
  const shelf = searchParams?.get("shelf");

  return <form role="search" action="/explorar" method="get" onSubmit={(event) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (query.length < 2) return;
    const params = new URLSearchParams({ q: query });
    const currentShelf = new URLSearchParams(window.location.search).get("shelf");
    if (currentShelf) params.set("shelf", currentShelf);
    router.push(`/explorar?${params.toString()}`);
  }} className="relative w-full max-w-[620px]">
    {shelf && <input type="hidden" name="shelf" value={shelf} />}
    <label htmlFor="global-book-search" className="sr-only">Buscar livros, autores ou ISBN</label>
    <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
    <input key={q} defaultValue={q} id="global-book-search" name="q" placeholder="Buscar livros, autores ou ISBN" required minLength={2} maxLength={200} className="h-11 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-sm text-ink shadow-[0_1px_2px_rgba(15,23,42,0.02)] placeholder:text-slate-400 hover:border-slate-300" />
  </form>;
}
