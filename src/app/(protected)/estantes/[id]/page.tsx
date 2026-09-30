import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ZodError } from "zod";
import { getShelf } from "@/features/shelves/shelf.service";
import { listShelfBooks } from "@/features/shelves/shelf-book.service";
import { BookCard } from "@/components/books/book-card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ShelfFormButton } from "@/components/shelves/shelf-form";
import { ShelfSort } from "@/components/shelves/shelf-sort";
import { AppError } from "@/lib/errors";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/current-user";

export const metadata: Metadata = { title: "Estante" };
export const dynamic = "force-dynamic";
export default async function ShelfPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string; page?: string }> }) {
  await requireUser();
  const { id } = await params; const query = await searchParams;
  const sort = query.sort === "title" || query.sort === "author" ? query.sort : "recent";
  const page = /^\d{1,6}$/.test(query.page ?? "") ? Math.min(417, Math.max(1, Number(query.page))) : 1;
  let shelf, result;
  try { [shelf, result] = await Promise.all([getShelf(id), listShelfBooks(id, { sort, limit: 24, offset: (page - 1) * 24 })]); }
  catch (error) { if (error instanceof ZodError || (error instanceof AppError && error.status === 404)) notFound(); throw error; }
  return <div className="pb-8"><Link href="/estantes" className="quiet-button mb-5 -ml-3 text-muted">← Minhas estantes</Link><div className="mb-7 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h1 className="wrap-anywhere font-serif text-[2rem] tracking-[-0.02em] sm:text-4xl">{shelf.name}</h1>{shelf.description && <p className="mt-2 max-w-2xl whitespace-pre-line leading-7 text-muted">{shelf.description}</p>}<p className="mt-2 text-sm text-muted">{result.total} {result.total === 1 ? "livro" : "livros"}</p></div><div className="flex flex-col gap-3 sm:flex-row"><Link href={`/explorar?shelf=${id}`} className="primary-button w-full sm:w-auto">Adicionar livros</Link>{shelf.type === "CUSTOM" && <ShelfFormButton shelf={shelf} />}</div></div><div className="mb-6 flex justify-end"><ShelfSort value={sort} /></div>{result.items.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{result.items.map(({ book }) => <div key={book.id} className="min-w-0"><BookCard book={book} /><ConfirmAction label="Remover da estante" title="Remover livro da estante?" description={`“${book.title}” será removido desta estante. O histórico de leitura, as resenhas e as anotações serão preservados.`} url={`/api/shelves/${id}/books/${book.id}`} /></div>)}</div> : <EmptyState icon={BookOpen} title={page > 1 ? "Não há livros nesta página." : "Esta estante ainda está vazia."} />}<nav aria-label="Paginação dos livros" className="mt-8 flex justify-between gap-3">{page > 1 ? <Link className="secondary-button" href={`?sort=${sort}&page=${page - 1}`}>Anterior</Link> : <span />}{page * 24 < result.total && <Link className="secondary-button" href={`?sort=${sort}&page=${page + 1}`}>Próxima</Link>}</nav></div>;
}
