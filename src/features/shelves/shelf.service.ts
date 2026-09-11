import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/current-user";
import { AppError } from "@/lib/errors";

import { createShelfSchema, updateShelfSchema, shelfIdSchema, listShelvesSchema } from "./shelf.schema";
import { findOwnedShelf, shelfSummarySelect, shelfSummary, writeLibrary } from "./shelf.repository";

function shelfConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AppError("SHELF_NAME_IN_USE", "Você já possui uma estante com esse nome.", 409);
  }
  throw error;
}

export async function listShelves(input: unknown = {}) {
  const user = await requireApiUser();
  const query = listShelvesSchema.parse(input);
  return getDb().$transaction(async (tx) => {
    const where = { userId: user.id };
    const [rows, total] = await Promise.all([
      tx.shelf.findMany({ where, select: shelfSummarySelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: query.limit, skip: query.offset }),
      tx.shelf.count({ where }),
    ]);
    return { items: rows.map(shelfSummary), total, ...query };
  }, { isolationLevel: "RepeatableRead" });
}

export async function getShelf(shelfId: string) {
  const user = await requireApiUser();
  const id = shelfIdSchema.parse(shelfId);
  const shelf = await getDb().shelf.findFirst({ where: { id, userId: user.id }, select: shelfSummarySelect });
  if (!shelf) throw new AppError("SHELF_NOT_FOUND", "Estante não encontrada.", 404);
  return shelfSummary(shelf);
}

export async function createShelf(input: unknown) {
  const user = await requireApiUser();
  const data = createShelfSchema.parse(input);
  try {
    return await writeLibrary(user.id, async (tx) => shelfSummary(await tx.shelf.create({
      data: { userId: user.id, name: data.name, normalizedName: data.name.toLowerCase(), description: data.description, type: "CUSTOM" }, select: shelfSummarySelect,
    })));
  } catch (error) { return shelfConflict(error); }
}

export async function updateShelf(shelfId: string, input: unknown) {
  const user = await requireApiUser();
  const id = shelfIdSchema.parse(shelfId);
  const data = updateShelfSchema.parse(input);
  try {
    return await writeLibrary(user.id, async (tx) => {
      const shelf = await findOwnedShelf(tx, user.id, id);
      if (shelf.type === "SYSTEM") throw new AppError("SYSTEM_SHELF_PROTECTED", "As estantes padrão não podem ser editadas.", 403);
      return shelfSummary(await tx.shelf.update({ where: { id, userId: user.id, type: "CUSTOM" }, data: {
        ...data, ...(data.name === undefined ? {} : { normalizedName: data.name.toLowerCase() }),
      }, select: shelfSummarySelect }));
    });
  } catch (error) { return shelfConflict(error); }
}

export async function deleteShelf(shelfId: string) {
  const user = await requireApiUser();
  const id = shelfIdSchema.parse(shelfId);
  return writeLibrary(user.id, async (tx) => {
    const shelf = await findOwnedShelf(tx, user.id, id);
    if (shelf.type === "SYSTEM") throw new AppError("SYSTEM_SHELF_PROTECTED", "As estantes padrão não podem ser excluídas.", 403);
    await tx.shelf.delete({ where: { id, userId: user.id, type: "CUSTOM" } });
  });
}
