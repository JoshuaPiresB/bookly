"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "./dialog";
import { useToast } from "./toast-provider";
import { mutate } from "@/lib/client-api";

export function ConfirmAction({ label, title, description, url, redirectTo, onDone, successMessage = "Removido com sucesso." }: { label: string; title: string; description: string; url: string; redirectTo?: string; onDone?: () => void; successMessage?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();
  async function confirm() {
    if (busy) return;
    setBusy(true); setError("");
    try { await mutate(url, "DELETE"); showToast(successMessage); setOpen(false); onDone?.(); startTransition(() => { if (redirectTo) router.push(redirectTo); router.refresh(); }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível remover."); }
    finally { setBusy(false); }
  }
  return <><button type="button" disabled={refreshing} onClick={() => { setError(""); setOpen(true); }} className="quiet-button text-red-700">{label}</button>{open && <Dialog title={title} onClose={() => setOpen(false)} busy={busy}><p className="leading-7 text-muted">{description}</p>{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button data-dialog-autofocus autoFocus type="button" disabled={busy} onClick={() => setOpen(false)} className="secondary-button">Cancelar</button><button type="button" disabled={busy} onClick={confirm} className="primary-button bg-red-700 hover:bg-red-800">{busy ? "Removendo…" : "Confirmar remoção"}</button></div></Dialog>}</>;
}
