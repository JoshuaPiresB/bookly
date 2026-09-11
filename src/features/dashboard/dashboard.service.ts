import "server-only";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { reviewSelect } from "@/features/reviews/review.service";

const dashboardBookSelect = { id: true, externalId: true, title: true, authors: true, coverUrl: true, pageCount: true } as const;

export async function getDashboardData() {
  const user = await requireUser();
  const db = getDb();
  const [reading, shelves, reviews] = await Promise.all([
    db.readingState.findMany({
      where: { userId: user.id, status: "READING" },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 2,
      select: { currentPage: true, updatedAt: true, book: { select: dashboardBookSelect } },
    }),
    db.shelf.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 10,
      select: {
        id: true, name: true, type: true, systemKey: true,
        _count: { select: { books: true } },
        books: { orderBy: { addedAt: "desc" }, take: 3, select: { book: { select: { id: true, title: true, coverUrl: true } } } },
      },
    }),
    db.review.findMany({
      where: { userId: user.id },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 2,
      select: { ...reviewSelect, book: { select: dashboardBookSelect } },
    }),
  ]);
  const systemOrder = { FAVORITES: 0, WANT_TO_READ: 1, READ: 2 } as const;
  const orderedShelves = shelves.sort((left, right) => {
    const leftOrder = left.systemKey ? systemOrder[left.systemKey] : 3;
    const rightOrder = right.systemKey ? systemOrder[right.systemKey] : 3;
    return leftOrder - rightOrder;
  }).slice(0, 3);
  return { user, reading, shelves: orderedShelves, reviews };
}
