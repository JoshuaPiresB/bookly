"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LoaderCircle } from "lucide-react";

export function GoogleSignInButton({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function connect() {
    setMessage("");
    if (!enabled) {
      setMessage("O login com Google ainda precisa ser configurado no servidor.");
      return;
    }
    setPending(true);
    try { await signIn("google", { callbackUrl: "/" }); }
    catch { setMessage("Não foi possível conectar ao Google. Tente novamente."); setPending(false); }
  }

  return <div className="mt-5 flex flex-col items-center">
    <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-subtle">Ou continue com</p>
    <button type="button" onClick={connect} disabled={pending} aria-label="Continuar com Google" title="Continuar com Google" className="flex h-14 w-14 items-center justify-center rounded-full border border-strong bg-panel shadow-[0_8px_24px_rgba(2,8,23,0.18)] transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_12px_30px_rgba(2,8,23,0.25)]">
      {pending ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-brand" /> : <GoogleIcon />}
    </button>
    {message && <p role="alert" className="mt-3 max-w-xs text-center text-xs leading-5 text-amber-700 dark:text-amber-300">{message}</p>}
  </div>;
}

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.39 13.87A6.02 6.02 0 0 1 6.07 12c0-.65.11-1.28.32-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.62Z" />
    <path fill="#EA4335" d="M12 6c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z" />
  </svg>;
}
