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
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%_-_1rem)] max-w-[560px] overscroll-contain overflow-y-auto rounded-2xl border border-line bg-panel p-4 text-ink shadow-xl backdrop:bg-slate-950/65 sm:max-h-[85dvh] sm:w-[calc(100%_-_2rem)] sm:p-6">
    <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:items-center sm:gap-4"><h2 id={titleId} className="min-w-0 font-serif text-xl font-semibold leading-7 sm:text-2xl">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Fechar diálogo" className="icon-button -mr-2 -mt-2 sm:mr-0 sm:mt-0"><X size={20} aria-hidden="true" /></button></div>{children}
  </dialog>;
}
