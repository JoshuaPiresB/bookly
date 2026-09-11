import { BookOpen } from "lucide-react";
import { BookGrid } from "./book-grid";
import { EmptyState } from "@/components/ui/empty-state";
import type { BookSearchResult } from "@/features/books/book.types";

export function CollectionView({ title, books, emptyMessage }: { title: string; books: BookSearchResult[]; emptyMessage: string }) {
  return <div className="pb-8"><div className="mb-7 flex items-end justify-between gap-4"><div><h1 className="font-serif text-[2rem] tracking-[-0.02em] sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-muted">{books.length} {books.length === 1 ? "livro" : "livros"}</p></div></div>{books.length ? <BookGrid books={books} /> : <EmptyState icon={BookOpen} title={emptyMessage} />}</div>;
}
