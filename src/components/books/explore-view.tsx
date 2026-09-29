"use client";

import { useEffect, useState } from "react";
import { BookSearch, TriangleAlert } from "lucide-react";
import type { BookSearchPage, BookSearchResult } from "@/features/books/book.types";
import { BookGrid } from "./book-grid";
import type { ShelfOption } from "./book-card";
import { BookGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type ApiPage<T> = { data: T[]; meta: Omit<BookSearchPage, "items"> };
type ApiError = { error?: { message?: string } };

export function ExploreView({ initialQuery, initialShelfId }: { initialQuery: string; initialShelfId?: string }) {
  const query = initialQuery.trim();
  const [books, setBooks] = useState<BookSearchResult[]>([]);
  const [shelves, setShelves] = useState<ShelfOption[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(query.length >= 2 ? "loading" : "idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (query.length < 2) {
      return () => controller.abort();
    }
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setError("");
        setStatus("loading");
      }
    });
    
    Promise.all([
      fetch(`/api/books/search?q=${encodeURIComponent(query)}&limit=24`, { signal: controller.signal }),
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
    });
    
    return () => { controller.abort(); };
  }, [query, attempt]);

  const visibleStatus = query.length < 2 ? "idle" : status;

  return <div className="pb-8"><div className="mb-8"><h1 className="font-serif text-[2rem] tracking-[-0.02em] sm:text-4xl">Explorar livros</h1></div>
    {visibleStatus === "loading" && <BookGridSkeleton />}
    {visibleStatus === "idle" && <EmptyState icon={BookSearch} title="Encontre seu próximo livro." description="Pesquise por título, nome do autor ou ISBN." />}
    {visibleStatus === "error" && <EmptyState icon={TriangleAlert} title="Não foi possível concluir a busca." description={error} action={<button type="button" className="secondary-button" onClick={() => { setError(""); setStatus("loading"); setAttempt((current) => current + 1); }}>Tentar novamente</button>} />}
    {visibleStatus === "success" && (books.length ? <><p className="mb-5 text-sm text-muted">{books.length} {books.length === 1 ? "resultado" : "resultados"}</p><BookGrid books={books} shelves={shelves} initialShelfId={initialShelfId} /></> : <EmptyState icon={BookSearch} title="Nenhum livro encontrado." description="Tente outro título, autor ou ISBN." />)}
  </div>;
}
