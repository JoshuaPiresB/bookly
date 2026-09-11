"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <html lang="pt-BR"><body style={{ fontFamily: "sans-serif", padding: "3rem", color: "#0b1f44", background: "#f8fafc" }}><main><h1>Não foi possível abrir o Bookly</h1><p>O serviço está temporariamente indisponível. Tente novamente em instantes.</p><button onClick={reset} style={{ padding: "0.75rem 1rem", cursor: "pointer" }}>Tentar novamente</button></main></body></html>;
}
