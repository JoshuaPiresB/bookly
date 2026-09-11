import { Star } from "lucide-react";
export function StarRating({ rating }: { rating: number }) {
  return <span className="inline-flex flex-wrap items-center gap-2" aria-label={`${rating} de 5 estrelas`}><span className="flex gap-0.5 text-amber-500" aria-hidden="true">{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} fill={value <= rating ? "currentColor" : "none"} />)}</span><span className="text-sm font-semibold">{rating} / 5</span></span>;
}
