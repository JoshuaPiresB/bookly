import { Skeleton } from "@/components/ui/skeleton";
export default function BookLoading() {
  return <div role="status" aria-label="Carregando livro" className="mx-auto max-w-6xl"><Skeleton className="mb-8 h-8 w-20" /><div className="grid gap-10 md:grid-cols-[220px_1fr] xl:grid-cols-[280px_1fr]"><Skeleton className="aspect-[2/3] w-full max-w-[280px]" /><div className="space-y-5"><Skeleton className="h-12 w-4/5" /><Skeleton className="h-6 w-1/2" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-44 w-full" /><Skeleton className="h-20 w-full" /></div></div><div className="mt-12 grid gap-8 lg:grid-cols-2"><Skeleton className="h-32" /><Skeleton className="h-32" /></div><span className="sr-only">Carregando informações do livro…</span></div>;
}
