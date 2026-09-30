"use client";
import { MoreHorizontal } from "lucide-react";
import { ShelfFormButton, type EditableShelf } from "./shelf-form";
import { ConfirmAction } from "@/components/ui/confirm-action";

export function ShelfMenu({ shelf }: { shelf: EditableShelf }) {
  return <details className="absolute right-3 top-3 z-10"><summary aria-label={`Opções de ${shelf.name}`} className="icon-button list-none bg-panel [&::-webkit-details-marker]:hidden"><MoreHorizontal size={20} /></summary><div className="absolute right-0 top-11 flex w-44 flex-col gap-1 rounded-xl border border-line bg-panel p-2 shadow-lg"><ShelfFormButton shelf={shelf} /><ConfirmAction label="Excluir" title="Excluir estante?" description={`A estante “${shelf.name}” e seus vínculos serão removidos. Os livros, resenhas e anotações serão preservados.`} url={`/api/shelves/${shelf.id}`} /></div></details>;
}
