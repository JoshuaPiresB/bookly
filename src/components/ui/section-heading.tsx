import Link from "next/link";

export function SectionHeading({ id, title, href, linkLabel = "Ver todas" }: { id?: string; title: string; href?: string; linkLabel?: string }) {
  return <div className="mb-4 flex items-center justify-between gap-4">
    <h2 id={id} className="text-[0.8125rem] font-semibold uppercase tracking-[0.13em] text-ink">{title}</h2>
    {href && <Link href={href} className="rounded-md text-sm font-semibold text-brand hover:text-blue-800">{linkLabel}</Link>}
  </div>;
}
