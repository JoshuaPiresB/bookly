"use client";

import { useEffect, useState } from "react";
import { BookSearch, Search, TriangleAlert } from "lucide-react";
import type { BookSearchPage, BookSearchResult } from "@/features/books/book.types";
import { BookGrid } from "./book-grid";
import type { ShelfOption } from "./book-card";
import { BookGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type ApiPage<T> = { data: T[]; meta: Omit<BookSearchPage, "items"> };
type ApiError = { error?: { message?: string } };

export function ExploreView({ initialQuery, initialShelfId }: { initialQuery: string; initialShelfId?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const debounced = query.trim();
  const [books, setBooks] = useState<BookSearchResult[]>([]);
  const [shelves, setShelves] = useState<ShelfOption[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(initialQuery.trim().length >= 2 ? "loading" : "idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (debounced.length < 2) return () => controller.abort();
    const timer = window.setTimeout(() => { void Promise.all([
      fetch(`/api/books/search?q=${encodeURIComponent(debounced)}&limit=24`, { signal: controller.signal }),
      fetch("/api/shelves?limit=40", { signal: controller.signal }),
    ]).then(async ([booksResponse, shelvesResponse]) => {
      const booksPayload = await booksResponse.json() as ApiPage<BookSearchResult> & ApiError;
      if (!booksResponse.ok) throw new Error(booksPayload.error?.message ?? "Não foi possível buscar livros.");
      if (controller.signal.aborted) return;
      let shelfOptions: ShelfOption[] = [];
      if (shelvesResponse.ok) {
        const shelvesPayload = await shelvesResponse.json() as { data?: ShelfOption[] };
        shelfOptions = shelvesPayload.data ?? [];
      }
      setBooks(booksPayload.data); setShelves(shelfOptions); setStatus("success");
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      setBooks([]); setError(reason instanceof Error ? reason.message : "Não foi possível buscar livros."); setStatus("error");
    }); }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [debounced, attempt]);

  function changeQuery(value: string) {
    setQuery(value);
    const trimmed = value.trim();
    if (trimmed === query.trim()) return;
    if (trimmed.length < 2) { setBooks([]); setError(""); setStatus("idle"); }
    else { setError(""); setStatus("loading"); }
  }

  return <div className="pb-8"><div className="mb-8"><h1 className="font-serif text-[2rem] tracking-[-0.02em] sm:text-4xl">Explorar livros</h1><form role="search" onSubmit={(event) => event.preventDefault()} className="relative mt-5 max-w-2xl"><label htmlFor="explore-search" className="sr-only">Buscar por título, autor ou ISBN</label><Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input id="explore-search" autoFocus value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Buscar por título, autor ou ISBN" minLength={2} maxLength={200} className="h-12 w-full rounded-xl border border-line bg-white pl-12 pr-4 text-base shadow-[0_1px_2px_rgba(15,23,42,0.02)] placeholder:text-slate-400 hover:border-slate-300" /></form></div>
    {status === "loading" && <BookGridSkeleton />}
    {status === "idle" && <EmptyState icon={BookSearch} title="Encontre seu próximo livro." description="Pesquise por título, nome do autor ou ISBN." />}
    {status === "error" && <EmptyState icon={TriangleAlert} title="Não foi possível concluir a busca." description={error} action={<button type="button" className="secondary-button" onClick={() => { setError(""); setStatus("loading"); setAttempt((current) => current + 1); }}>Tentar novamente</button>} />}
    {status === "success" && (books.length ? <><p className="mb-5 text-sm text-muted">{books.length} {books.length === 1 ? "resultado" : "resultados"}</p><BookGrid books={books} shelves={shelves} initialShelfId={initialShelfId} /></> : <EmptyState icon={BookSearch} title="Nenhum livro encontrado." description="Tente outro título, autor ou ISBN." />)}
  </div>;
}
