"use client";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
export function ShelfSort({ value }: { value: string }) {
  const router = useRouter(); const pathname = usePathname(); const [pending, transition] = useTransition();
  return <label className="flex w-full flex-col gap-2 text-sm text-muted sm:w-auto sm:flex-row sm:items-center sm:gap-3">Ordenar por<select aria-label="Ordenar livros" disabled={pending} value={value} onChange={(event) => transition(() => router.push(`${pathname}?sort=${event.target.value}`))} className="w-full rounded-lg border border-line bg-panel p-2.5 text-ink sm:w-auto"><option value="recent">Adicionados recentemente</option><option value="title">Título A-Z</option><option value="author">Autor</option></select></label>;
}
