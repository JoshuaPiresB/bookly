import "server-only";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { bookMetadataSelect } from "@/features/books/book.service";
import { reviewSelect, reviewBookSelect } from "@/features/reviews/review.service";

const shelfPreviewSelect = {
  id: true, name: true, description: true, type: true, systemKey: true,
  _count: { select: { books: true } },
  books: { orderBy: { addedAt: "desc" as const }, take: 3, select: { book: { select: { id: true, title: true, coverUrl: true } } } },
} as const;

function mapShelf<T extends { _count: { books: number } }>(shelf: T) {
  const { _count, ...rest } = shelf;
  return { ...rest, bookCount: _count.books };
}

export async function getShelvesOverview() {
  const user = await requireUser();
  const shelves = await getDb().shelf.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: shelfPreviewSelect });
  return shelves.map(mapShelf);
}

export async function getReadingCollection(kind: "READ" | "WANT_TO_READ") {
  const user = await requireUser();
  return getDb().book.findMany({
    where: { OR: [
      { readingStates: { some: { userId: user.id, status: kind } } },
      { shelfBooks: { some: { shelf: { userId: user.id, systemKey: kind } } } },
    ] },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: bookMetadataSelect,
  });
}

export async function getAllReviews() {
  const user = await requireUser();
  return getDb().review.findMany({ where: { userId: user.id }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { ...reviewSelect, book: { select: reviewBookSelect } } });
}
