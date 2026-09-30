"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useState } from "react";
import { BookOpen, Check, LogIn } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

type LoginRequiredContextValue = {
  authenticated: boolean;
  requireLogin: () => boolean;
};

const LoginRequiredContext = createContext<LoginRequiredContextValue | null>(null);

export function LoginRequiredProvider({ authenticated, children }: { authenticated: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({
    authenticated,
    requireLogin() {
      if (authenticated) return true;
      setOpen(true);
      return false;
    },
  }), [authenticated]);

  return <LoginRequiredContext.Provider value={value}>
    {children}
    {open && <Dialog title="Entre para continuar no Bookly" onClose={() => setOpen(false)}>
      <div className="rounded-2xl border border-info-line bg-info/70 p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_8px_24px_rgba(37,99,235,0.24)]"><BookOpen size={23} aria-hidden="true" /></span>
        <p className="mt-4 font-semibold text-ink">Este é um recurso exclusivo da sua conta.</p>
        <p className="mt-2 leading-7 text-muted">Faça login para acessar esta tela e organizar toda a sua experiência de leitura.</p>
      </div>
      <ul className="mt-5 grid gap-2 text-sm text-body sm:grid-cols-2">
        {["Crie e organize estantes", "Acompanhe suas leituras", "Favorite seus livros", "Escreva resenhas e notas"].map((item) => <li key={item} className="flex items-center gap-2"><Check size={16} className="text-brand" aria-hidden="true" />{item}</li>)}
      </ul>
      <div className="mobile-action-stack mt-7 flex flex-wrap justify-end gap-3">
        <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Agora não</button>
        <Link href="/cadastro" className="secondary-button">Criar conta</Link>
        <Link href="/login" className="primary-button"><LogIn size={17} aria-hidden="true" />Fazer login</Link>
      </div>
    </Dialog>}
  </LoginRequiredContext.Provider>;
}

export function useLoginRequired() {
  const context = useContext(LoginRequiredContext);
  if (!context) throw new Error("useLoginRequired deve ser usado dentro de LoginRequiredProvider.");
  return context;
}
