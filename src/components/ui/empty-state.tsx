import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="surface flex min-h-36 flex-col items-start gap-3 border-dashed px-5 py-6 text-left sm:flex-row sm:items-center sm:gap-4">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hover text-subtle"><Icon aria-hidden="true" size={21} strokeWidth={1.7} /></span>
    <div><p className="font-medium text-ink">{title}</p>{description && <p className="mt-1 text-sm leading-6 text-muted">{description}</p>}{action && <div className="mt-3">{action}</div>}</div>
  </div>;
}
