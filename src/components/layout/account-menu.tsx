"use client";

import { ChevronDown, Settings, UserCircle2, LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  
  const isGuest = !email;
  const firstName = name.trim().split(/\s+/)[0] || name;
  const initials = isGuest ? "" : name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  
  useEffect(() => {
    function close(event: MouseEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);
  
  return <div ref={container} className="relative shrink-0">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="menu" aria-label={`Abrir menu da conta de ${name}`} className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 py-1 text-sm font-medium text-ink hover:bg-hover">
      {isGuest ? (
        <UserCircle2 className="h-9 w-9 text-subtle" strokeWidth={1.5} />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-action text-xs font-semibold tracking-wide text-white" aria-hidden="true">{initials}</span>
      )}
      <span className="hidden max-w-32 truncate xl:block">{firstName}</span>
      <ChevronDown aria-hidden="true" size={15} className={`hidden text-subtle transition-transform sm:block ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-xl border border-line bg-panel p-2 shadow-[0_18px_50px_rgba(2,8,23,0.28)]">
      <div className="border-b border-line px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        {!isGuest && <p className="mt-0.5 truncate text-xs text-muted">{email}</p>}
      </div>
      <div className="mt-1">
        {isGuest ? (
          <Link role="menuitem" href="/login" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-body hover:bg-hover hover:text-ink"><LogIn aria-hidden="true" size={16} />Fazer Login</Link>
        ) : (
          <>
            <Link role="menuitem" href="/configuracoes" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-body hover:bg-hover hover:text-ink"><Settings aria-hidden="true" size={16} />Configurações</Link>
            <LogoutButton variant="menu" />
          </>
        )}
      </div>
    </div>}
  </div>;
}
