import "server-only";
import { getDb } from "@/lib/db";
import { requireApiUser } from "@/lib/current-user";
import type { Prisma } from "@/generated/prisma/client";
import type { BookSearchResult } from "./book.types";
import { bookSearchSchema, externalIdSchema } from "./book.schema";
import { getGoogleBook, searchGoogleBooks } from "./integrations/google-books/client";

export const bookMetadataSelect = {
  externalId: true, title: true, subtitle: true, authors: true, description: true,
  coverUrl: true, categories: true, publisher: true, publishedDate: true, pageCount: true,
  language: true, isbn10: true, isbn13: true, averageRating: true, ratingsCount: true,
} as const;

/** Leitura global de metadados; nunca persiste apenas por abrir o detalhe. */
export async function resolveBookMetadata(externalId: string): Promise<BookSearchResult> {
  const id = externalIdSchema.parse(externalId);
  return await getDb().book.findUnique({ where: { externalId: id }, select: bookMetadataSelect }) ?? await getGoogleBook(id);
}

/** Apenas serviços internos passam metadados já resolvidos pelo servidor. */
export function persistResolvedBook(metadata: BookSearchResult, db: Prisma.TransactionClient = getDb()) {
  return db.book.upsert({ where: { externalId: metadata.externalId }, create: metadata,
    // UPDATE não vazio permite UPSERT nativo e não sobrescreve metadados existentes.
    update: { externalId: metadata.externalId } });
}

export async function ensureBookExists(externalId: string) {
  const id = externalIdSchema.parse(externalId);
  const existing = await getDb().book.findUnique({ where: { externalId: id } });
  if (existing) return existing;
  return persistResolvedBook(await getGoogleBook(id));
}

export async function searchBooks(input: unknown) {
  await requireApiUser();
  return searchGoogleBooks(bookSearchSchema.parse(input));
}

export async function getBookDetails(externalId: string) {
  await requireApiUser();
  return resolveBookMetadata(externalId);
}
