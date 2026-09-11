import type { Metadata } from "next";
import { ExploreView } from "@/components/books/explore-view";

export const metadata: Metadata = { title: "Explorar" };
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; shelf?: string | string[] }> }) {
  const { q: value, shelf } = await searchParams;
  const query = typeof value === "string" ? value.slice(0, 200) : "";
  return <ExploreView initialQuery={query} initialShelfId={typeof shelf === "string" ? shelf : undefined} />;
}
