import type { Metadata } from "next";
import { Library } from "lucide-react";
import { getShelvesOverview } from "@/features/dashboard/library-view.service";
import { ShelfCard } from "@/components/shelves/shelf-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ShelfFormButton } from "@/components/shelves/shelf-form";

export const metadata: Metadata = { title: "Minhas estantes" };
export const dynamic = "force-dynamic";
export default async function ShelvesPage() {
  const shelves = await getShelvesOverview();
  const rank = { FAVORITES: 0, WANT_TO_READ: 1, READ: 2 };
  shelves.sort((a, b) => (a.systemKey ? rank[a.systemKey] : 3) - (b.systemKey ? rank[b.systemKey] : 3));
  return <div className="pb-8"><div className="mb-7 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="font-serif text-[2rem] tracking-[-0.02em] sm:text-4xl">Minhas estantes</h1><p className="mt-2 text-sm text-muted">{shelves.length} {shelves.length === 1 ? "estante" : "estantes"}</p></div><ShelfFormButton /></div>{shelves.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shelves.map((shelf) => <ShelfCard key={shelf.id} shelf={shelf} manage />)}</div> : <EmptyState icon={Library} title="Você ainda não possui estantes." />}</div>;
}
