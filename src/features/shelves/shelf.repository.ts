import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const shelfSummarySelect = { id: true, name: true, description: true, type: true, systemKey: true, createdAt: true, updatedAt: true, _count: { select: { books: true } } } as const;
type ShelfRow = Prisma.ShelfGetPayload<{ select: typeof shelfSummarySelect }>;
export function shelfSummary({ _count, ...shelf }: ShelfRow) { return { ...shelf, bookCount: _count.books }; }

export async function findOwnedShelf(db: Prisma.TransactionClient, userId: string, shelfId: string) {
  const shelf = await db.shelf.findFirst({ where: { id: shelfId, userId } });
  if (!shelf) throw new AppError("SHELF_NOT_FOUND", "Estante não encontrada.", 404);
  return shelf;
}

/** Serializa escritas da mesma biblioteca, incluindo transições entre estantes. */
export function writeLibrary<T>(userId: string, action: (tx: Prisma.TransactionClient) => Promise<T>) {
  return getDb().$transaction(async (tx) => {
    const users = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
    if (!users.length) throw new AppError("UNAUTHENTICATED", "Entre na sua conta para continuar.", 401);
    return action(tx);
  }, { maxWait: 5000, timeout: 10000 });
}
