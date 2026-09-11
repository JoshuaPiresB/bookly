import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { ZodError } from "zod";
import { getBookLibrary } from "@/features/books/book-library.service";
import { BookCover } from "@/components/ui/book-cover";
import { BookActions } from "@/components/books/book-actions";
import { BookJournal } from "@/components/journal/book-journal";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Livro" };
export const dynamic = "force-dynamic";


export default async function BookPage({ params }: { params: Promise<{ externalId: string }> }) {
  let data;
  try { data = await getBookLibrary((await params).externalId); }
  catch (error) { if (error instanceof ZodError || (error instanceof AppError && error.status === 404)) notFound(); throw error; }
  const { book, localId, shelves, reading, review, notes } = data;
  let language = book.language;
  if (language) { try { language = new Intl.DisplayNames(["pt-BR"], { type: "language" }).of(language) ?? language; } catch { /* Preserve the provider's language code. */ } }
  const details = [["Idioma", language], ["Páginas", book.pageCount], ["Ano", book.publishedDate?.match(/^\d{4}/)?.[0]], ["ISBN", book.isbn13 || book.isbn10]].filter(([, value]) => value !== null && value !== undefined && value !== "");
  return <article className="mx-auto max-w-6xl pb-10">
    <Link href="/explorar" className="quiet-button mb-7 -ml-3 text-muted">← Voltar</Link>
    <div className="grid items-start gap-8 md:grid-cols-[220px_1fr] xl:grid-cols-[280px_1fr] xl:gap-14">
      <div className="aspect-[2/3] w-full max-w-[280px]"><BookCover src={book.coverUrl} title={book.title} sizes="(min-width: 1280px) 280px, 220px" priority /></div>
      <div className="min-w-0">
        <h1 className="font-serif text-3xl font-semibold leading-tight tracking-[-0.025em] lg:text-[2.65rem]">{book.title}</h1>
        {book.subtitle && <p className="mt-2 text-lg text-muted">{book.subtitle}</p>}
        {book.authors.length > 0 && <p className="mt-3 text-lg text-slate-600">{book.authors.join(", ")}</p>}
        {book.averageRating !== null && <p className="mt-4 flex items-center gap-2 text-sm"><Star size={18} className="text-amber-400" fill="currentColor" aria-hidden="true" /><span className="font-semibold">{book.averageRating.toLocaleString("pt-BR")} / 5</span>{book.ratingsCount !== null && <span className="text-muted">({book.ratingsCount} avaliações)</span>}</p>}
        {book.categories.length > 0 && <ul aria-label="Categorias" className="mt-4 flex flex-wrap gap-2">{book.categories.map((category) => <li key={category} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{category}</li>)}</ul>}
        <BookActions externalId={book.externalId} localId={localId} shelves={shelves} reading={reading ? { status: reading.status, currentPage: reading.currentPage } : null} pageCount={book.pageCount} />
        {shelves.some((shelf) => shelf.added) && <p className="mt-4 text-xs text-muted">Nas estantes: {shelves.filter((shelf) => shelf.added).map((shelf, index) => <span key={shelf.id}>{index > 0 && ", " }<Link href={`/estantes/${shelf.id}`} className="underline-offset-4 hover:text-brand hover:underline">{shelf.name}</Link></span>)}</p>}
        {book.description && <section className="mt-8"><h2 className="font-serif text-xl font-semibold">Sinopse</h2><p className="mt-3 whitespace-pre-line leading-8 text-slate-600">{book.description}</p></section>}
        {details.length > 0 && <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 lg:grid-cols-4">{details.map(([label, value]) => <div key={label}><dt className="text-xs font-medium text-muted">{label}</dt><dd className="mt-1.5 break-words text-sm font-medium">{value}</dd></div>)}</dl>}
      </div>
    </div>
    <BookJournal externalId={book.externalId} pageCount={book.pageCount} finishedAt={reading?.finishedAt ?? null} review={review} notes={notes} />
  </article>;
}
