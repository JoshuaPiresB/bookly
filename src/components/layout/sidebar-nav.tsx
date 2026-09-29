"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, BookOpenCheck, BookSearch, Home, Library, Settings, Star } from "lucide-react";
import { useLoginRequired } from "@/components/auth/login-required-provider";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/explorar", label: "Explorar", icon: BookSearch },
  { href: "/estantes", label: "Minhas Estantes", icon: Library },
  { href: "/lidos", label: "Lidos", icon: BookOpenCheck },
  { href: "/quero-ler", label: "Quero ler", icon: BookMarked },
  { href: "/resenhas", label: "Resenhas", icon: Star },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { authenticated, requireLogin } = useLoginRequired();
  return <nav aria-label="Navegação principal" className="quiet-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-0">
    {items.map(({ href, label, icon: Icon }) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
      const publicDestination = href === "/" || href === "/explorar";
      const className = `flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors ${active ? "bg-soft text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`;
      if (!authenticated && !publicDestination) return <button key={href} type="button" onClick={requireLogin} className={`${className} w-full text-left`}>
        <Icon aria-hidden="true" size={19} strokeWidth={1.75} /><span>{label}</span>
      </button>;
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={className}>
        <Icon aria-hidden="true" size={19} strokeWidth={active ? 2 : 1.75} /><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
