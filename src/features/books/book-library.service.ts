import "server-only";
import { requireUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { getBookDetails } from "./book.service";
import { reviewSelect } from "@/features/reviews/review.service";
import { noteSelect } from "@/features/notes/note.service";

export async function getBookLibrary(externalId: string) {
  const user = await requireUser();
  const book = await getBookDetails(externalId);
  const id = book.externalId;
  return getDb().$transaction(async (tx) => {
    const local = await tx.book.findUnique({ where: { externalId: id }, select: { id: true } });
    const shelves = await tx.shelf.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, name: true, systemKey: true, books: { where: { book: { externalId: id } }, select: { bookId: true } } } });
    const reading = local ? await tx.readingState.findUnique({ where: { userId_bookId: { userId: user.id, bookId: local.id } } }) : null;
    const review = local ? await tx.review.findUnique({ where: { userId_bookId: { userId: user.id, bookId: local.id } }, select: reviewSelect }) : null;
    const notes = local ? await tx.readingNote.findMany({ where: { userId: user.id, bookId: local.id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: noteSelect }) : [];
    return { book, localId: local?.id ?? null, reading, review, notes, shelves: shelves.map(({ books, ...shelf }) => ({ ...shelf, added: books.length > 0 })) };
  }, { isolationLevel: "RepeatableRead" });
}
