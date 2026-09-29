import type { BookSearchResult } from "@/features/books/book.types";
import { BookCard, type ShelfOption } from "./book-card";

export function BookGrid({ books, shelves, initialShelfId }: { books: BookSearchResult[]; shelves?: ShelfOption[]; initialShelfId?: string }) {
  return <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{books.map((book) => <BookCard key={book.externalId} book={book} shelves={shelves} initialShelfId={initialShelfId} />)}</div>;
}
