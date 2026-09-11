import type { Metadata } from "next";
import { CollectionView } from "@/components/books/collection-view";
import { getReadingCollection } from "@/features/dashboard/library-view.service";

export const metadata: Metadata = { title: "Lidos" };
export const dynamic = "force-dynamic";
export default async function ReadPage() { return <CollectionView title="Lidos" books={await getReadingCollection("READ")} emptyMessage="Você ainda não marcou nenhum livro como lido." />; }
