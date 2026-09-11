"use client";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
export function ShelfSort({ value }: { value: string }) {
  const router = useRouter(); const pathname = usePathname(); const [pending, transition] = useTransition();
  return <label className="flex items-center gap-3 text-sm text-muted">Ordenar por<select aria-label="Ordenar livros" disabled={pending} value={value} onChange={(event) => transition(() => router.push(`${pathname}?sort=${event.target.value}`))} className="rounded-lg border border-line bg-white p-2.5 text-ink"><option value="recent">Adicionados recentemente</option><option value="title">Título A-Z</option><option value="author">Autor</option></select></label>;
}
