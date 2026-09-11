import { StarRating } from "./star-rating";
export type ReviewDisplay = { id: string; rating: number; title: string | null; content: string; finishedAt: Date | null; isPublic: boolean; updatedAt: Date };
export function ReviewBody({ review, compact = false }: { review: ReviewDisplay; compact?: boolean }) {
  const date = review.finishedAt ?? review.updatedAt;
  return <div><div className="flex flex-wrap items-center gap-x-3 gap-y-2"><StarRating rating={review.rating} /><time className="text-xs text-muted" dateTime={date.toISOString()}>{review.finishedAt ? "Concluído em " : "Atualizada em "}{date.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</time></div>{review.title && <h3 className="mt-4 font-semibold wrap-anywhere">{review.title}</h3>}<p className={`mt-3 whitespace-pre-line text-sm leading-7 text-slate-600 wrap-anywhere ${compact ? "line-clamp-3" : ""}`}>{review.content}</p>{!compact && <p className="mt-3 text-xs text-muted">{review.isPublic ? "Pública" : "Privada"}</p>}</div>;
}
