"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

type ToastKind = "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind };
type ToastContextValue = { showToast: (message: string, kind?: ToastKind) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, message, kind }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4500);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>{children}<div className="fixed inset-x-4 bottom-4 z-[90] ml-auto flex w-auto max-w-[360px] flex-col gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(360px,calc(100vw-2rem))]" aria-live="polite" aria-atomic="true">
    {toasts.map((toast) => <div key={toast.id} role="status" className="flex items-start gap-3 rounded-xl border border-line bg-panel p-4 text-sm text-ink shadow-[0_18px_45px_rgba(2,8,23,0.32)]">
      {toast.kind === "success" ? <CheckCircle2 aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-emerald-600" /> : <CircleAlert aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-red-600" />}
      <span className="min-w-0 flex-1 leading-5">{toast.message}</span><button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Fechar mensagem" className="rounded text-subtle hover:text-ink"><X aria-hidden="true" size={17} /></button>
    </div>)}
  </div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de ToastProvider.");
  return context;
}
