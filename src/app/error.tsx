"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-lg px-6 py-20"><h1 className="font-serif text-3xl">Não foi possível carregar a página</h1><p className="my-5 text-muted">O serviço pode estar temporariamente indisponível. Tente novamente em instantes.</p><button className="primary-button" onClick={reset}>Tentar novamente</button></main>;
}
