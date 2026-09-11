import "server-only";
import { Prisma, type Book } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/current-user";
import { persistResolvedBook, resolveBookMetadata } from "@/features/books/book.service";
import { addShelfBookSchema, bookIdSchema, listShelfBooksSchema, shelfIdSchema } from "./shelf.schema";
import { findOwnedShelf, writeLibrary } from "./shelf.repository";

export async function listShelfBooks(shelfId: string, input: unknown = {}) {
  const user = await requireApiUser();
  const id = shelfIdSchema.parse(shelfId);
  const query = listShelfBooksSchema.parse(input);
  return getDb().$transaction(async (tx) => {
    await findOwnedShelf(tx, user.id, id);
    const order = query.sort === "title"
      ? Prisma.sql`lower(b."title" COLLATE "pg_c_utf8") ASC, b."id" ASC`
      : query.sort === "author"
        ? Prisma.sql`lower((b."authors")[1] COLLATE "pg_c_utf8") ASC NULLS LAST, lower(b."title" COLLATE "pg_c_utf8") ASC, b."id" ASC`
        : Prisma.sql`sb."addedAt" DESC, b."id" ASC`;
    const rows = await tx.$queryRaw<Array<Book & { addedAt: Date }>>`
      SELECT b.*, sb."addedAt" FROM "ShelfBook" sb
      JOIN "Shelf" s ON s."id" = sb."shelfId"
      JOIN "Book" b ON b."id" = sb."bookId"
      WHERE s."id" = ${id}::uuid AND s."userId" = ${user.id}::uuid
      ORDER BY ${order} LIMIT ${query.limit} OFFSET ${query.offset}`;
    const total = await tx.shelfBook.count({ where: { shelfId: id, shelf: { userId: user.id } } });
    return { items: rows.map(({ addedAt, ...book }) => ({ book, addedAt })), total, ...query };
  }, { isolationLevel: "RepeatableRead" });
}

export async function addBookToShelf(shelfId: string, input: unknown) {
  const user = await requireApiUser();
  const id = shelfIdSchema.parse(shelfId);
  const { externalId } = addShelfBookSchema.parse(input);
  // Verificar antes de chamar o provedor; revalidar depois de obter o lock.
  await findOwnedShelf(getDb(), user.id, id);
  const metadata = await resolveBookMetadata(externalId);
  // Nenhum HTTP dentro da transação. Book, vínculo e estado confirmam juntos.
  return writeLibrary(user.id, async (tx) => {
    const shelf = await findOwnedShelf(tx, user.id, id);
    const book = await persistResolvedBook(metadata, tx);
    const membership = await tx.shelfBook.createMany({ data: { shelfId: id, bookId: book.id }, skipDuplicates: true });
    if (shelf.systemKey === "WANT_TO_READ") {
      // Nunca regredir uma leitura em andamento/concluída.
      await tx.readingState.createMany({ data: { userId: user.id, bookId: book.id, status: "WANT_TO_READ" }, skipDuplicates: true });
    } else if (shelf.systemKey === "READ") {
      const current = await tx.readingState.findUnique({ where: { userId_bookId: { userId: user.id, bookId: book.id } } });
      const finishedAt = current?.finishedAt ?? new Date();
      await tx.readingState.upsert({
        where: { userId_bookId: { userId: user.id, bookId: book.id } },
        create: { userId: user.id, bookId: book.id, status: "READ", finishedAt, currentPage: book.pageCount ?? 0 },
        update: { status: "READ", finishedAt, currentPage: book.pageCount ?? current?.currentPage ?? 0 },
      });
      await tx.shelfBook.deleteMany({ where: { bookId: book.id, shelf: { userId: user.id, systemKey: "WANT_TO_READ" } } });
    }
    const entry = await tx.shelfBook.findUniqueOrThrow({ where: { shelfId_bookId: { shelfId: id, bookId: book.id } } });
    return { book, addedAt: entry.addedAt, added: membership.count > 0 };
  });
}

export async function removeBookFromShelf(shelfId: string, bookId: string) {
  const user = await requireApiUser();
  const id = shelfIdSchema.parse(shelfId);
  const localBookId = bookIdSchema.parse(bookId);
  return writeLibrary(user.id, async (tx) => {
    await findOwnedShelf(tx, user.id, id);
    const result = await tx.shelfBook.deleteMany({ where: { shelfId: id, bookId: localBookId, shelf: { userId: user.id } } });
    // Remover uma associação não apaga o catálogo nem o histórico de leitura.
    return { removed: result.count > 0 };
  });
}
