import type { BookSearchResult } from "@/features/books/book.types";
import { BookCard, type ShelfOption } from "./book-card";

export function BookGrid({ books, shelves, initialShelfId }: { books: BookSearchResult[]; shelves?: ShelfOption[]; initialShelfId?: string }) {
  return <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{books.map((book) => <BookCard key={book.externalId} book={book} shelves={shelves} initialShelfId={initialShelfId} />)}</div>;
}
