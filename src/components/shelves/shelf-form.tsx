"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast-provider";
import { mutate } from "@/lib/client-api";

export type EditableShelf = { id: string; name: string; description?: string | null };
export function ShelfForm({ shelf, onClose, onSaved }: { shelf?: EditableShelf; onClose: () => void; onSaved?: (shelf: EditableShelf) => void }) {
  const [name, setName] = useState(shelf?.name ?? "");
  const [description, setDescription] = useState(shelf?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { showToast } = useToast();
  return <Dialog title={shelf ? "Editar estante" : "Nova estante"} onClose={onClose} busy={busy}>
    <form onSubmit={async (event) => {
      event.preventDefault(); if (busy) return; setBusy(true); setError("");
      try {
        const result = await mutate<EditableShelf>(shelf ? `/api/shelves/${shelf.id}` : "/api/shelves", shelf ? "PATCH" : "POST", { name, description });
        showToast(shelf ? "Estante atualizada." : "Estante criada."); onSaved?.(result.data); router.refresh(); onClose();
      } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar a estante."); }
      finally { setBusy(false); }
    }} className="space-y-5">
      <label className="block text-sm font-medium">Nome da estante<input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="field mt-2" /></label>
      <label className="block text-sm font-medium">Descrição <span className="font-normal text-muted">(opcional)</span><textarea maxLength={500} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="field mt-2 resize-y" /></label>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <div className="mobile-action-stack flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="secondary-button">Cancelar</button><button disabled={busy || !name.trim()} className="primary-button">{busy ? "Salvando…" : shelf ? "Salvar alterações" : "Criar estante"}</button></div>
    </form>
  </Dialog>;
}

export function ShelfFormButton({ shelf }: { shelf?: EditableShelf }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className={`${shelf ? "secondary-button" : "primary-button"} w-full sm:w-auto`}>{shelf ? "Editar" : "+ Nova estante"}</button>{open && <ShelfForm shelf={shelf} onClose={() => setOpen(false)} />}</>;
}
