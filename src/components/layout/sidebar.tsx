"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <>
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-panel/95 px-4 backdrop-blur-sm lg:hidden">
      <Brand />
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-navigation" aria-label="Abrir menu principal" className="icon-button border border-line bg-panel text-ink">
        <Menu size={21} aria-hidden="true" />
      </button>
    </header>

    {open && <div className="fixed inset-0 z-[80] lg:hidden">
      <button type="button" aria-label="Fechar menu principal" onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full bg-slate-950/60 backdrop-blur-[2px]" />
      <aside id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Menu principal" className="relative flex h-full w-[min(86vw,320px)] flex-col overflow-y-auto border-r border-line bg-panel shadow-2xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <Brand />
          <button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Fechar menu principal" className="icon-button text-muted"><X size={21} aria-hidden="true" /></button>
        </div>
        <div className="flex-1 py-4"><SidebarNav mobile onNavigate={() => setOpen(false)} /></div>
      </aside>
    </div>}

    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line bg-panel lg:block">
      <div className="flex h-[96px] items-center px-7"><Brand /></div>
      <SidebarNav />
    </aside>
  </>;
}
