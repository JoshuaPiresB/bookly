export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-placeholder/70 ${className}`} />;
}

export function BookGridSkeleton() {
  return <div aria-label="Carregando livros" role="status" className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
    {Array.from({ length: 12 }, (_, index) => <div key={index} className="surface p-3 sm:p-4"><Skeleton className="aspect-[2/3] w-full" /><Skeleton className="mt-4 h-5 w-4/5" /><Skeleton className="mt-2 h-4 w-1/2" /><Skeleton className="mt-5 h-10 w-full" /></div>)}
    <span className="sr-only">Carregando resultados…</span>
  </div>;
}
