import { ReviewEditor } from "./review-form";
import type { ReviewDisplay } from "./review-body";
import { ConfirmAction } from "@/components/ui/confirm-action";
export function ReviewControls({ review, externalId }: { review: ReviewDisplay; externalId: string }) {
  return <div className="mt-3 flex gap-2"><ReviewEditor externalId={externalId} review={{ ...review, finishedAt: review.finishedAt?.toISOString() ?? null }} /><ConfirmAction label="Excluir" title="Excluir resenha?" description="O texto e a avaliação serão excluídos. O livro, as anotações e o histórico de leitura serão preservados." url={`/api/reviews/${review.id}`} successMessage="Resenha excluída." /></div>;
}
