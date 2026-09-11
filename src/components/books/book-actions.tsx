"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Plus } from "lucide-react";
import { ShelfForm } from "@/components/shelves/shelf-form";
import { useToast } from "@/components/ui/toast-provider";
import { mutate } from "@/lib/client-api";
import { ReadingButton } from "@/components/reading/reading-button";

type Shelf = { id: string; name: string; systemKey: string | null; added: boolean };
export function BookActions({ externalId, localId, shelves, reading, pageCount }: { externalId: string; localId: string | null; shelves: Shelf[]; reading: { status: string; currentPage: number } | null; pageCount: number | null }) {
  const [open, setOpen] = useState(false); const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false); const [refreshing, transition] = useTransition();
  const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter(); const { showToast } = useToast();
  const favorite = shelves.find((shelf) => shelf.systemKey === "FAVORITES");
  useEffect(() => { if (!open) return; const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, [open]);
  async function act(url: string, method: "POST" | "PATCH" | "DELETE", data?: unknown, message = "Livro adicionado à estante.") {
    if (busy || refreshing) return; setBusy(true);
    try { await mutate(url, method, data); showToast(message); transition(() => router.refresh()); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : "Não foi possível atualizar o livro.", "error"); }
    finally { setBusy(false); }
  }
  return <div className="mt-7"><div className="flex flex-wrap items-center gap-3"><div ref={root} className="relative" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}><button ref={trigger} type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="primary-button"><Plus size={18} />Adicionar à estante</button>{open && <div className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[80vw] rounded-xl border border-line bg-white p-2 shadow-xl"><p className="px-3 py-2 text-sm font-semibold">Suas estantes</p><div className="max-h-64 overflow-y-auto">{shelves.map((shelf) => <button key={shelf.id} type="button" disabled={busy || refreshing || shelf.added} onClick={() => act(`/api/shelves/${shelf.id}/books`, "POST", { externalId })} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-soft"><span className="truncate">{shelf.name}</span>{shelf.added && <span className="flex shrink-0 items-center gap-1 text-xs text-brand"><Check size={14} />Adicionado</span>}</button>)}</div><button type="button" disabled={busy || refreshing} onClick={() => { setOpen(false); setCreate(true); }} className="quiet-button mt-2 w-full border-t border-line text-brand">+ Nova estante</button></div>}</div><button type="button" disabled={busy || refreshing || reading?.status === "READ"} onClick={() => act(`/api/books/${encodeURIComponent(externalId)}/reading`, "PATCH", { status: "READ" }, "Livro marcado como lido.")} className="secondary-button">{reading?.status === "READ" ? <><Check size={17} />Lido</> : "Marcar como lido"}</button>{favorite && <button type="button" disabled={busy || refreshing} aria-pressed={favorite.added} onClick={() => act(favorite.added && localId ? `/api/shelves/${favorite.id}/books/${localId}` : `/api/shelves/${favorite.id}/books`, favorite.added && localId ? "DELETE" : "POST", favorite.added ? undefined : { externalId }, favorite.added ? "Livro removido dos favoritos." : "Livro favoritado.")} className="secondary-button"><Heart size={17} fill={favorite.added ? "currentColor" : "none"} className={favorite.added ? "text-brand" : ""} />{favorite.added ? "Favoritado" : "Favoritar"}</button>}</div><ReadingButton externalId={externalId} pageCount={pageCount} currentPage={reading?.currentPage} status={reading?.status} />{(busy || refreshing) && <span role="status" className="ml-3 text-sm text-muted">Atualizando…</span>}{create && <ShelfForm onClose={() => setCreate(false)} onSaved={() => setOpen(true)} />}</div>;
}
