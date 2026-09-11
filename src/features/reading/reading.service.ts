import "server-only";
import { requireApiUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { externalIdSchema } from "@/features/books/book.schema";
import { resolveBookMetadata, persistResolvedBook } from "@/features/books/book.service";
import { writeLibrary } from "@/features/shelves/shelf.repository";
import { updateReadingSchema } from "./reading.schema";

export async function getReading(externalId: string) {
  const user = await requireApiUser();
  const id = externalIdSchema.parse(externalId);
  return getDb().readingState.findFirst({ where: { userId: user.id, book: { externalId: id } } });
}

export async function updateReading(externalId: string, input: unknown) {
  const user = await requireApiUser();
  const data = updateReadingSchema.parse(input);
  const metadata = await resolveBookMetadata(externalIdSchema.parse(externalId));
  return writeLibrary(user.id, async (tx) => {
    const book = await persistResolvedBook(metadata, tx);
    const where = { userId_bookId: { userId: user.id, bookId: book.id } };
    const current = await tx.readingState.findUnique({ where });
    const status = data.status ?? current?.status ?? "READING";
    const restarting = status === "READING" && current?.status === "READ";
    const page = status === "READ" ? book.pageCount ?? data.currentPage ?? current?.currentPage ?? 0
      : data.currentPage ?? (status === "WANT_TO_READ" || restarting ? 0 : current?.currentPage ?? 0);
    if ((data.currentPage !== undefined && book.pageCount !== null && data.currentPage > book.pageCount) || (book.pageCount !== null && page > book.pageCount)) {
      throw new AppError("INVALID_PAGE", "A página atual não pode ultrapassar o total de páginas do livro.");
    }
    if (data.currentPage !== undefined && status === "READ" && book.pageCount !== null && data.currentPage !== book.pageCount) {
      throw new AppError("INVALID_PAGE", "Um livro lido deve estar na última página. Comece uma nova leitura para alterar o progresso.");
    }
    const startedAt = status === "WANT_TO_READ" ? null : restarting ? new Date() : current?.startedAt ?? (status === "READING" ? new Date() : null);
    const finishedAt = status === "READ" ? current?.finishedAt ?? new Date() : null;
    const state = await tx.readingState.upsert({ where, create: { userId: user.id, bookId: book.id, status, currentPage: page, startedAt, finishedAt }, update: { status, currentPage: page, startedAt, finishedAt } });
    // O status explícito define as coleções; o progresso sozinho não conclui a leitura.
    const key = status === "READING" ? null : status;
    await tx.shelfBook.deleteMany({ where: { bookId: book.id, shelf: { userId: user.id, systemKey: { in: key === "READ" ? ["WANT_TO_READ"] : key === "WANT_TO_READ" ? ["READ"] : ["READ", "WANT_TO_READ"] } } } });
    if (key) {
      const shelf = await tx.shelf.findFirstOrThrow({ where: { userId: user.id, systemKey: key } });
      await tx.shelfBook.createMany({ data: { shelfId: shelf.id, bookId: book.id }, skipDuplicates: true });
    }
    return state;
  });
}
