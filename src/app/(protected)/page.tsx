import Link from "next/link";
import { BookOpen, Library, MoreHorizontal, Star as StarIcon } from "lucide-react";
import { getDashboardData } from "@/features/dashboard/dashboard.service";
import { BookCover } from "@/components/ui/book-cover";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { ShelfCard } from "@/components/shelves/shelf-card";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReadingButton } from "@/components/reading/reading-button";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const { user, reading, shelves, reviews } = await getDashboardData();
  const firstName = user.name.trim().split(/\s+/)[0];
  return <div className="space-y-10 pb-8">
    <h1 className="font-serif text-[2rem] leading-tight tracking-[-0.02em] text-ink sm:text-4xl">Bem-vindo de volta, {firstName}</h1>

    <section aria-labelledby="continue-reading"><SectionHeading id="continue-reading" title="Continue lendo" />
      {reading.length ? <div className="grid gap-4 xl:grid-cols-2">{reading.map(({ book, currentPage }) => {
        const percentage = book.pageCount ? Math.min(100, Math.round((currentPage / book.pageCount) * 100)) : 0;
        return <article key={book.id} className="surface group flex min-h-56 gap-5 p-5 transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="h-[176px] w-[116px] shrink-0"><BookCover src={book.coverUrl} title={book.title} sizes="116px" priority /></div>
          <div className="flex min-w-0 flex-1 flex-col"><div className="flex items-start gap-3"><div className="min-w-0"><h3 className="line-clamp-2 font-serif text-xl font-semibold leading-7">{book.title}</h3><p className="mt-1 truncate text-sm text-muted">{book.authors[0] ?? "Autor não informado"}</p></div><details className="group/menu relative ml-auto shrink-0"><summary aria-label={`Mais opções para ${book.title}`} className="flex h-9 w-9 list-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-ink [&::-webkit-details-marker]:hidden"><MoreHorizontal aria-hidden="true" size={20} /></summary><div className="absolute right-0 top-10 z-20 w-36 rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_35px_rgba(15,23,42,0.12)]"><Link href={`/livros/${encodeURIComponent(book.externalId)}`} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Abrir livro</Link></div></details></div>
          <div className="mt-auto"><div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted">{book.pageCount ? `${currentPage} de ${book.pageCount} páginas` : `Página ${currentPage}`}</span>{book.pageCount && <span className="font-semibold text-ink">{percentage}%</span>}</div><ProgressBar value={percentage} label={`Progresso de leitura de ${book.title}`} /><ReadingButton externalId={book.externalId} currentPage={currentPage} pageCount={book.pageCount} status="READING" label="Continuar" /></div></div>
        </article>;
      })}</div> : <EmptyState icon={BookOpen} title="Você ainda não começou nenhuma leitura." description="Quando um livro estiver em andamento, seu progresso aparecerá aqui." />}
    </section>

    <section aria-labelledby="my-shelves"><SectionHeading id="my-shelves" title="Minhas estantes" href="/estantes" />
      {shelves.length ? <div className="grid gap-4 md:grid-cols-3">{shelves.map((shelf) => <ShelfCard key={shelf.id} shelf={{ ...shelf, bookCount: shelf._count.books }} />)}</div> : <EmptyState icon={Library} title="Você ainda não possui estantes." />}
    </section>

    <section aria-labelledby="latest-reviews"><SectionHeading id="latest-reviews" title="Últimas resenhas" href="/resenhas" />
      {reviews.length ? <div className="grid gap-4 xl:grid-cols-2">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
        : <EmptyState icon={StarIcon} title="Você ainda não escreveu nenhuma resenha." description="Suas avaliações mais recentes aparecerão aqui." />}
    </section>
  </div>;
}
