export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function BookGridSkeleton() {
  return <div aria-label="Carregando livros" role="status" className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
    {Array.from({ length: 8 }, (_, index) => <div key={index} className="surface p-4"><Skeleton className="aspect-[2/3] w-full" /><Skeleton className="mt-4 h-5 w-4/5" /><Skeleton className="mt-2 h-4 w-1/2" /><Skeleton className="mt-5 h-10 w-full" /></div>)}
    <span className="sr-only">Carregando resultados…</span>
  </div>;
}
