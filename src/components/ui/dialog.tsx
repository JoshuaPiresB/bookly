"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/** Native modal: focus containment, Escape, inert background and focus restoration. */
export function Dialog({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    // React autoFocus runs before showModal; explicitly focus once the dialog is visible.
    const initialFocus = dialog?.querySelector<HTMLElement>("[data-dialog-autofocus]") ?? dialog?.querySelector<HTMLElement>("input:checked") ?? dialog?.querySelector<HTMLElement>("input, textarea");
    initialFocus?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-[560px] overflow-y-auto rounded-2xl border border-line bg-white p-6 text-ink shadow-xl backdrop:bg-ink/30">
    <div className="mb-6 flex items-center justify-between gap-4"><h2 id={titleId} className="font-serif text-2xl font-semibold">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Fechar diálogo" className="icon-button"><X size={20} aria-hidden="true" /></button></div>{children}
  </dialog>;
}
