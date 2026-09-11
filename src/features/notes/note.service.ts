import "server-only";
import { requireApiUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { resolveBookMetadata, persistResolvedBook } from "@/features/books/book.service";
import { externalIdSchema } from "@/features/books/book.schema";
import { writeLibrary } from "@/features/shelves/shelf.repository";
import { createNoteSchema, updateNoteSchema, journalIdSchema } from "@/features/journal/journal.schema";

export const noteSelect = { id: true, content: true, page: true, createdAt: true, updatedAt: true } as const;
function validatePage(page: number | null | undefined, total: number | null) {
  if (page != null && total !== null && page > total) throw new AppError("INVALID_NOTE_PAGE", "A página da anotação não pode ultrapassar o total de páginas do livro.");
}

export async function listNotes(externalId: string) {
  const user = await requireApiUser();
  const id = externalIdSchema.parse(externalId);
  return getDb().readingNote.findMany({ where: { userId: user.id, book: { externalId: id } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: noteSelect });
}

export async function createNote(externalId: string, input: unknown) {
  const user = await requireApiUser();
  const data = createNoteSchema.parse(input);
  const metadata = await resolveBookMetadata(externalIdSchema.parse(externalId));
  return writeLibrary(user.id, async (tx) => {
    const book = await persistResolvedBook(metadata, tx);
    validatePage(data.page, book.pageCount);
    return tx.readingNote.create({ data: { ...data, bookId: book.id, userId: user.id }, select: noteSelect });
  });
}

export async function updateNote(id: string, input: unknown) {
  const user = await requireApiUser();
  const noteId = journalIdSchema.parse(id);
  const data = updateNoteSchema.parse(input);
  return writeLibrary(user.id, async (tx) => {
    const owned = await tx.readingNote.findFirst({ where: { id: noteId, userId: user.id }, select: { page: true, book: { select: { pageCount: true } } } });
    if (!owned) throw new AppError("NOTE_NOT_FOUND", "Anotação não encontrada.", 404);
    validatePage(data.page === undefined ? owned.page : data.page, owned.book.pageCount);
    return tx.readingNote.update({ where: { id: noteId, userId: user.id }, data, select: noteSelect });
  });
}

export async function deleteNote(id: string) {
  const user = await requireApiUser();
  const noteId = journalIdSchema.parse(id);
  return writeLibrary(user.id, async (tx) => {
    const result = await tx.readingNote.deleteMany({ where: { id: noteId, userId: user.id } });
    if (!result.count) throw new AppError("NOTE_NOT_FOUND", "Anotação não encontrada.", 404);
  });
}
