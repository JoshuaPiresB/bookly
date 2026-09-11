import type { Metadata } from "next";
import { CollectionView } from "@/components/books/collection-view";
import { getReadingCollection } from "@/features/dashboard/library-view.service";

export const metadata: Metadata = { title: "Quero ler" };
export const dynamic = "force-dynamic";
export default async function WantToReadPage() { return <CollectionView title="Quero ler" books={await getReadingCollection("WANT_TO_READ")} emptyMessage="Sua lista de próximas leituras está vazia." />; }
