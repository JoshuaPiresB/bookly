"use client";

import { useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ variant = "button" }: { variant?: "button" | "menu" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  async function logout() {
    if (sending.current) return;
    sending.current = true; setPending(true); setError("");
    try {
      await signOut({ redirect: false, callbackUrl: "/" });
      router.replace("/"); router.refresh();
    } catch { setError("Não foi possível sair. Tente novamente."); }
    finally { sending.current = false; setPending(false); }
  }
  const styles = variant === "menu"
    ? "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-ink"
    : "inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:border-slate-300 hover:bg-slate-50";
  return <div><button type="button" role={variant === "menu" ? "menuitem" : undefined} onClick={logout} disabled={pending} className={styles}><LogOut aria-hidden="true" size={16} />{pending ? "Saindo…" : "Sair"}</button>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
