import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto max-w-lg px-6 py-20"><h1 className="font-serif text-3xl">Página não encontrada</h1><Link className="mt-6 inline-block text-brand underline" href="/">Voltar ao início</Link></main>;
}
