import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="surface flex min-h-36 items-center gap-4 border-dashed px-5 py-6 text-left">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><Icon aria-hidden="true" size={21} strokeWidth={1.7} /></span>
    <div><p className="font-medium text-ink">{title}</p>{description && <p className="mt-1 text-sm leading-6 text-muted">{description}</p>}{action && <div className="mt-3">{action}</div>}</div>
  </div>;
}
