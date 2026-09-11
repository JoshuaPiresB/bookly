import { ReviewEditor } from "@/components/reviews/review-form";
import { ReviewBody, type ReviewDisplay } from "@/components/reviews/review-body";
import { ReviewControls } from "@/components/reviews/review-controls";
import { NoteEditor, type NoteDraft } from "@/components/notes/note-form";
import { NoteList } from "@/components/notes/note-list";

export function BookJournal({ externalId, pageCount, finishedAt, review, notes }: { externalId: string; pageCount: number | null; finishedAt: Date | null; review: ReviewDisplay | null; notes: Array<NoteDraft & { createdAt: Date }> }) {
  return <div className="mt-14 grid gap-8 border-t border-line pt-9 lg:grid-cols-2 lg:gap-12">
    <section aria-labelledby="my-review"><h2 id="my-review" className="font-serif text-2xl font-semibold">Minha resenha</h2>
      {review ? <div className="mt-5"><ReviewBody review={review} /><ReviewControls review={review} externalId={externalId} /></div> : <div className="mt-5 space-y-4"><p className="text-sm text-muted">Você ainda não escreveu uma resenha para este livro.</p><ReviewEditor externalId={externalId} defaultFinishedAt={finishedAt?.toISOString()} /></div>}
    </section>
    <section aria-labelledby="my-notes"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="my-notes" className="font-serif text-2xl font-semibold">Minhas anotações</h2><NoteEditor externalId={externalId} pageCount={pageCount} /></div>
      {notes.length ? <NoteList externalId={externalId} pageCount={pageCount} notes={notes} /> : <p className="mt-5 text-sm text-muted">Você ainda não tem anotações para este livro.</p>}
    </section>
  </div>;
}
