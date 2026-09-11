import "server-only";
import { requireApiUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { resolveBookMetadata, persistResolvedBook } from "@/features/books/book.service";
import { writeLibrary } from "@/features/shelves/shelf.repository";
import { createReviewSchema, updateReviewSchema, journalIdSchema } from "@/features/journal/journal.schema";

export const reviewSelect = { id: true, title: true, content: true, rating: true, finishedAt: true, isPublic: true, createdAt: true, updatedAt: true } as const;
export const reviewBookSelect = { id: true, externalId: true, title: true, authors: true, coverUrl: true } as const;

export async function listReviews() {
  const user = await requireApiUser();
  // Public is a visibility preference, not permission to expose other users' records here.
  return getDb().review.findMany({ where: { userId: user.id }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { ...reviewSelect, book: { select: reviewBookSelect } } });
}

export async function createReview(input: unknown) {
  const user = await requireApiUser();
  const { externalId, ...data } = createReviewSchema.parse(input);
  const metadata = await resolveBookMetadata(externalId);
  return writeLibrary(user.id, async (tx) => {
    const book = await persistResolvedBook(metadata, tx);
    const existing = await tx.review.findUnique({ where: { userId_bookId: { userId: user.id, bookId: book.id } }, select: { id: true } });
    if (existing) throw new AppError("REVIEW_EXISTS", "Você já escreveu uma resenha para este livro. Edite a resenha existente.", 409);
    return tx.review.create({ data: { ...data, userId: user.id, bookId: book.id }, select: reviewSelect });
  });
}

export async function updateReview(id: string, input: unknown) {
  const user = await requireApiUser();
  const reviewId = journalIdSchema.parse(id);
  const data = updateReviewSchema.parse(input);
  return writeLibrary(user.id, async (tx) => {
    const owned = await tx.review.findFirst({ where: { id: reviewId, userId: user.id }, select: { id: true } });
    if (!owned) throw new AppError("REVIEW_NOT_FOUND", "Resenha não encontrada.", 404);
    // Neither ownership nor the book relationship can be reassigned through PATCH.
    return tx.review.update({ where: { id: reviewId, userId: user.id }, data, select: reviewSelect });
  });
}

export async function deleteReview(id: string) {
  const user = await requireApiUser();
  const reviewId = journalIdSchema.parse(id);
  return writeLibrary(user.id, async (tx) => {
    const result = await tx.review.deleteMany({ where: { id: reviewId, userId: user.id } });
    if (!result.count) throw new AppError("REVIEW_NOT_FOUND", "Resenha não encontrada.", 404);
  });
}
