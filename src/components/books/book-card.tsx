"use client";

import Link from "next/link";
import { BookPlus, ChevronDown, LoaderCircle, Star } from "lucide-react";
import { useState } from "react";
import { BookCover } from "@/components/ui/book-cover";
import { useToast } from "@/components/ui/toast-provider";
import type { BookSearchResult } from "@/features/books/book.types";
import { useLoginRequired } from "@/components/auth/login-required-provider";

export type ShelfOption = { id: string; name: string };
type ErrorPayload = { error?: { message?: string } };

export function BookCard({ book, shelves = [], initialShelfId }: { book: BookSearchResult; shelves?: ShelfOption[]; initialShelfId?: string }) {
  const [shelfId, setShelfId] = useState(shelves.find((shelf) => shelf.id === initialShelfId)?.id ?? shelves[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const { showToast } = useToast();
  const { requireLogin } = useLoginRequired();
  async function addToShelf() {
    if (!shelfId || pending) return;
    setPending(true);
    try {
      const response = await fetch(`/api/shelves/${encodeURIComponent(shelfId)}/books`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ externalId: book.externalId }) });
      const payload = await response.json() as ErrorPayload & { message?: string };
      if (!response.ok) throw new Error(payload.error?.message ?? "Não foi possível adicionar o livro.");
      showToast(payload.message ?? "Livro adicionado à estante.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Não foi possível adicionar o livro.", "error"); }
    finally { setPending(false); }
  }
  return <article className="group min-w-0">
    <Link href={`/livros/${encodeURIComponent(book.externalId)}`} className="block aspect-[2/3] overflow-hidden rounded-[11px] bg-recessed transition-transform duration-200 hover:-translate-y-0.5"><BookCover src={book.coverUrl} title={book.title} sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, (max-width: 1280px) 22vw, 220px" /></Link>
    <div className="pt-3"><Link href={`/livros/${encodeURIComponent(book.externalId)}`} className="line-clamp-2 font-serif text-[0.98rem] font-semibold leading-5 text-ink hover:text-brand sm:text-[1.05rem] sm:leading-6">{book.title}</Link><p className="mt-1 truncate text-xs text-muted sm:text-sm">{book.authors.join(", ") || "Autor não informado"}</p>
      <div className="mt-2 flex min-h-5 items-center">{book.averageRating !== null && <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink"><Star aria-hidden="true" size={15} className="text-amber-400" fill="currentColor" />{book.averageRating.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>}</div>
      <div className="mt-3 flex gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Estante para {book.title}</span><select disabled={shelves.length === 0} value={shelfId} onChange={(event) => setShelfId(event.target.value)} className="h-10 w-full appearance-none truncate rounded-lg border border-line bg-panel pl-2.5 pr-7 text-xs text-body hover:border-strong sm:pl-3 sm:pr-8 sm:text-sm">{shelves.length > 0 ? shelves.map((shelf) => <option key={shelf.id} value={shelf.id}>{shelf.name}</option>) : <option value="">Entre para salvar</option>}</select><ChevronDown aria-hidden="true" size={15} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-subtle sm:right-2.5" /></label><button type="button" onClick={shelves.length > 0 ? addToShelf : requireLogin} disabled={pending || (shelves.length > 0 && !shelfId)} aria-label={`Adicionar ${book.title} à estante selecionada`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-action text-white hover:bg-action-hover">{pending ? <LoaderCircle aria-hidden="true" size={17} className="animate-spin" /> : <BookPlus aria-hidden="true" size={17} />}</button></div>
    </div>
  </article>;
}
