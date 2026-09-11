import { Skeleton } from "@/components/ui/skeleton";

export default function ProtectedLoading() {
  return <div role="status" aria-label="Carregando conteúdo" className="space-y-8"><Skeleton className="h-10 w-72 max-w-full" /><div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" /></div><span className="sr-only">Carregando…</span></div>;
}
