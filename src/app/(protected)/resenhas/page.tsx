import type { Metadata } from "next";
import { Star } from "lucide-react";
import { getAllReviews } from "@/features/dashboard/library-view.service";
import { ReviewCard } from "@/components/reviews/review-card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Resenhas" };
export const dynamic = "force-dynamic";
export default async function ReviewsPage() {
  const reviews = await getAllReviews();
  return <div className="pb-8"><div className="mb-7"><h1 className="font-serif text-[2rem] tracking-[-0.02em] sm:text-4xl">Minhas resenhas</h1><p className="mt-2 text-sm text-muted">{reviews.length} {reviews.length === 1 ? "resenha" : "resenhas"}</p></div>{reviews.length ? <div className="grid items-start gap-4 xl:grid-cols-2">{reviews.map((review) => <ReviewCard key={review.id} review={review} manage />)}</div> : <EmptyState icon={Star} title="Você ainda não escreveu nenhuma resenha." />}</div>;
}
