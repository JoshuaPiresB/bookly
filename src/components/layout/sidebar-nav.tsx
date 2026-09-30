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

export function SidebarNav({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { authenticated, requireLogin } = useLoginRequired();
  return <nav aria-label="Navegação principal" className={`flex flex-col gap-1 px-4 ${mobile ? "pb-6" : ""}`}>
    {items.map(({ href, label, icon: Icon }) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
      const publicDestination = href === "/" || href === "/explorar";
      const className = `flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors ${active ? "bg-soft text-brand" : "text-body hover:bg-hover hover:text-ink"}`;
      if (!authenticated && !publicDestination) return <button key={href} type="button" onClick={() => { onNavigate?.(); requireLogin(); }} className={`${className} w-full text-left`}>
        <Icon aria-hidden="true" size={19} strokeWidth={1.75} /><span>{label}</span>
      </button>;
      return <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={className}>
        <Icon aria-hidden="true" size={19} strokeWidth={active ? 2 : 1.75} /><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
