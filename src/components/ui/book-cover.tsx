"use client";
import Image from "next/image";
import { useState } from "react";
import { BookOpen } from "lucide-react";

export function BookCover({ src, title, sizes = "96px", priority = false }: { src: string | null; title: string; sizes?: string; priority?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <div className="relative h-full w-full overflow-hidden rounded-[10px] bg-slate-100 shadow-[0_8px_22px_rgba(15,23,42,0.10)]">
    {src && src !== failedSrc ? <Image src={src} alt={`Capa de ${title}`} fill sizes={sizes} priority={priority} onError={() => setFailedSrc(src)} className="object-cover" />
      : <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 px-3 text-center text-slate-400"><BookOpen aria-hidden="true" size={24} strokeWidth={1.5} /><span className="line-clamp-3 text-xs font-medium leading-4">{title}</span></div>}
  </div>;
}
