import Link from "next/link";
import { BookHeart, BookMarked, BookOpenCheck, Library } from "lucide-react";
import { BookCover } from "@/components/ui/book-cover";
import { ShelfMenu } from "./shelf-menu";

type ShelfPreview = { id: string; name: string; description?: string | null; systemKey: "FAVORITES" | "WANT_TO_READ" | "READ" | null; bookCount: number; books: Array<{ book: { id: string; title: string; coverUrl: string | null } }> };

export function ShelfCard({ shelf, manage = false }: { shelf: ShelfPreview; manage?: boolean }) {
  const Icon = shelf.systemKey === "FAVORITES" ? BookHeart : shelf.systemKey === "WANT_TO_READ" ? BookMarked : shelf.systemKey === "READ" ? BookOpenCheck : Library;
  return <article className="relative"><Link href={`/estantes/${shelf.id}`} className={`surface group flex min-h-48 flex-col p-5 transition-[border-color,box-shadow] hover:border-strong hover:shadow-[0_10px_30px_rgba(2,8,23,0.14)] ${manage && !shelf.systemKey ? "pr-14" : ""}`}>
    <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soft text-brand"><Icon aria-hidden="true" size={19} /></span><div className="min-w-0"><h3 className="truncate font-semibold">{shelf.name}</h3><p className="mt-0.5 text-sm text-muted">{shelf.bookCount} {shelf.bookCount === 1 ? "livro" : "livros"}</p>{shelf.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{shelf.description}</p>}</div></div>
    <div className="mt-auto flex h-[78px] items-end gap-2 pt-4">{shelf.books.length ? shelf.books.map(({ book }, index) => <div key={book.id} className="h-[68px] w-[45px] transition-transform group-hover:-translate-y-0.5" style={{ transform: `translateY(${index * 2}px)` }}><BookCover src={book.coverUrl} title={book.title} sizes="45px" /></div>) : <span className="text-sm text-subtle">Estante vazia</span>}</div>
  </Link>{manage && !shelf.systemKey && <ShelfMenu shelf={shelf} />}</article>;
}
