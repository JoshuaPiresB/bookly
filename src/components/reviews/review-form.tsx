"use client";
import { useId, useState } from "react";
import { Star } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useJournalSubmit } from "@/components/journal/use-journal-submit";

export type ReviewDraft = { id: string; rating: number; title: string | null; content: string; finishedAt: string | null; isPublic: boolean };
function ReviewForm({ externalId, review, defaultFinishedAt, onClose }: { externalId: string; review?: ReviewDraft; defaultFinishedAt?: string | null; onClose: () => void }) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [title, setTitle] = useState(review?.title ?? "");
  const [content, setContent] = useState(review?.content ?? "");
  const [finishedAt, setFinishedAt] = useState((review ? review.finishedAt : defaultFinishedAt)?.slice(0, 10) ?? "");
  const [isPublic, setIsPublic] = useState(review?.isPublic ?? false);
  const ratingName = useId();
  const contentId = useId();
  const { submit, busy, error } = useJournalSubmit(onClose);
  return <Dialog title={review ? "Editar resenha" : "Escrever resenha"} onClose={onClose} busy={busy}>
    <form onSubmit={(event) => {
      event.preventDefault();
      const data = { rating, title: title || null, content, finishedAt: finishedAt || null, isPublic };
      void submit(review ? `/api/reviews/${review.id}` : "/api/reviews", review ? "PATCH" : "POST", review ? data : { ...data, externalId }, review ? "Resenha atualizada." : "Resenha salva.");
    }}>
      <fieldset disabled={busy} className="space-y-5">
        <fieldset><legend className="mb-2 text-sm font-medium">Minha nota</legend><div className="flex justify-between gap-1 sm:justify-start sm:gap-2">{[1, 2, 3, 4, 5].map((value) => <label key={value} className="relative cursor-pointer"><input className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0" type="radio" required name={ratingName} aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`} value={value} checked={rating === value} onChange={() => setRating(value)} /><span className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-lg text-amber-500 peer-hover:bg-amber-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand dark:peer-hover:bg-amber-950/40"><Star aria-hidden="true" size={27} fill={value <= rating ? "currentColor" : "none"} /></span></label>)}</div></fieldset>
        <label className="block text-sm font-medium">Título <span className="font-normal text-muted">(opcional)</span><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} className="field mt-2" /></label>
        <div><label htmlFor={contentId} className="block text-sm font-medium">O que você achou deste livro?</label><textarea id={contentId} required rows={5} maxLength={20000} value={content} onChange={(event) => setContent(event.target.value)} className="field mt-2 resize-y" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Data de conclusão<input type="date" min="0001-01-01" max="9999-12-31" value={finishedAt} onChange={(event) => setFinishedAt(event.target.value)} className="field mt-2" /></label><label className="block text-sm font-medium">Visibilidade<select value={isPublic ? "public" : "private"} onChange={(event) => setIsPublic(event.target.value === "public")} className="field mt-2"><option value="private">Privada</option><option value="public">Pública</option></select></label></div>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <div className="mobile-action-stack flex justify-end gap-3"><button type="button" onClick={onClose} className="secondary-button">Cancelar</button><button disabled={busy || !rating || !content.trim()} className="primary-button">{busy ? "Salvando…" : "Salvar resenha"}</button></div>
      </fieldset>
    </form>
  </Dialog>;
}

export function ReviewEditor({ externalId, review, defaultFinishedAt }: { externalId: string; review?: ReviewDraft; defaultFinishedAt?: string | null }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className={review ? "quiet-button" : "secondary-button"} onClick={() => setOpen(true)}>{review ? "Editar" : "Escrever resenha"}</button>{open && <ReviewForm externalId={externalId} review={review} defaultFinishedAt={defaultFinishedAt} onClose={() => setOpen(false)} />}</>;
}
