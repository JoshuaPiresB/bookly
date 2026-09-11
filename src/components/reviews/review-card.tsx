import Link from "next/link";
import { BookCover } from "@/components/ui/book-cover";
import { ReviewBody, type ReviewDisplay } from "./review-body";
import { ReviewControls } from "./review-controls";

type ReviewPreview = ReviewDisplay & { book: { id: string; externalId: string; title: string; authors: string[]; coverUrl: string | null } };
export function ReviewCard({ review, manage = false }: { review: ReviewPreview; manage?: boolean }) {
  const href = `/livros/${encodeURIComponent(review.book.externalId)}`;
  return <article className="surface flex items-start gap-4 p-5">
    <Link href={href} className="h-[112px] w-[74px] shrink-0"><BookCover src={review.book.coverUrl} title={review.book.title} sizes="74px" /></Link>
    <div className="min-w-0 flex-1">
      <h3 className="font-serif text-lg font-semibold wrap-anywhere"><Link href={href} className="hover:text-brand">{review.book.title}</Link></h3>
      <p className="mt-0.5 text-sm text-muted wrap-anywhere">{review.book.authors.join(", ") || "Autor não informado"}</p>
      <div className="mt-3"><ReviewBody review={review} compact={!manage} /></div>
      {manage && <ReviewControls review={review} externalId={review.book.externalId} />}
    </div>
  </article>;
}
