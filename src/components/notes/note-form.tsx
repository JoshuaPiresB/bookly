"use client";
import { useId, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useJournalSubmit } from "@/components/journal/use-journal-submit";

export type NoteDraft = { id: string; page: number | null; content: string };
function NoteForm({ externalId, pageCount, note, onClose }: { externalId: string; pageCount: number | null; note?: NoteDraft; onClose: () => void }) {
  const [page, setPage] = useState(note?.page?.toString() ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const contentId = useId();
  const { submit, busy, error } = useJournalSubmit(onClose);
  return <Dialog title={note ? "Editar anotação" : "Nova anotação"} onClose={onClose} busy={busy}>
    <form onSubmit={(event) => {
      event.preventDefault();
      void submit(note ? `/api/notes/${note.id}` : `/api/books/${encodeURIComponent(externalId)}/notes`, note ? "PATCH" : "POST", { content, page: page === "" ? null : Number(page) }, note ? "Anotação atualizada." : "Anotação adicionada.");
    }}><fieldset disabled={busy} className="space-y-5">
      <label className="block text-sm font-medium">Página <span className="font-normal text-muted">(opcional)</span><input type="number" min={1} max={pageCount ?? 2147483647} step={1} value={page} onChange={(event) => setPage(event.target.value)} className="field mt-2" /></label>
      <div><label htmlFor={contentId} className="block text-sm font-medium">Anotação</label><textarea id={contentId} required rows={6} maxLength={20000} value={content} onChange={(event) => setContent(event.target.value)} className="field mt-2 resize-y" /></div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="secondary-button">Cancelar</button><button disabled={busy || !content.trim()} className="primary-button">{busy ? "Salvando…" : "Salvar anotação"}</button></div>
    </fieldset></form>
  </Dialog>;
}
export function NoteEditor({ externalId, pageCount, note }: { externalId: string; pageCount: number | null; note?: NoteDraft }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className={note ? "quiet-button" : "secondary-button"} onClick={() => setOpen(true)}>{note ? "Editar" : "+ Nova anotação"}</button>{open && <NoteForm externalId={externalId} pageCount={pageCount} note={note} onClose={() => setOpen(false)} />}</>;
}
