import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { Brand } from "@/components/layout/brand";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/");
  return <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
    <div className="mb-9"><Brand /></div>
    <section className="w-full max-w-md rounded-[14px] border border-line bg-white px-6 py-8 shadow-sm sm:px-9 sm:py-10">{children}</section>
    <div className="mt-8"><Link href="/" className="text-sm font-medium text-muted hover:text-ink transition-colors">← Voltar ao início</Link></div>
  </main>;
}
