import { MoreHorizontal } from "lucide-react";
import { NoteEditor, type NoteDraft } from "./note-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
type Props = { externalId: string; pageCount: number | null; notes: Array<NoteDraft & { createdAt: Date }> };

function NoteItems({ externalId, pageCount, notes }: Props) {
  return <ul className="divide-y divide-line">{notes.map((note) => <li key={note.id} className="py-4">
    <div className="flex items-center gap-3 text-xs text-muted">
      {note.page !== null && <span>Pág. {note.page}</span>}
      <time dateTime={note.createdAt.toISOString()}>{note.createdAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</time>
      <details className="relative ml-auto"><summary className="icon-button list-none [&::-webkit-details-marker]:hidden" aria-label={`Opções da anotação${note.page !== null ? ` da página ${note.page}` : " sem página"}`}><MoreHorizontal size={19} /></summary>
        <div className="absolute right-0 z-10 flex w-36 flex-col rounded-xl border border-line bg-panel p-2 shadow-sm"><NoteEditor externalId={externalId} pageCount={pageCount} note={note} /><ConfirmAction label="Excluir" title="Excluir anotação?" description="Esta anotação será excluída. O livro e os demais registros serão preservados." url={`/api/notes/${note.id}`} successMessage="Anotação excluída." /></div>
      </details>
    </div>
    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-body wrap-anywhere">{note.content}</p>
  </li>)}</ul>;
}

export function NoteList(props: Props) {
  return <div className="mt-3"><NoteItems {...props} notes={props.notes.slice(0, 3)} />{props.notes.length > 3 && <details className="group/more"><summary className="quiet-button text-brand"><span className="group-open/more:hidden">Ver todas as anotações ({props.notes.length})</span><span className="hidden group-open/more:inline">Mostrar menos</span></summary><NoteItems {...props} notes={props.notes.slice(3)} /></details>}</div>;
}
