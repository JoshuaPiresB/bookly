"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { mutate } from "@/lib/client-api";

export function useJournalSubmit(onClose: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const [refreshing, transition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();
  async function submit(url: string, method: "POST" | "PATCH", data: unknown, message: string) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      await mutate(url, method, data);
      showToast(message); onClose(); transition(() => router.refresh());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar. Tente novamente.");
    } finally { locked.current = false; setBusy(false); }
  }
  return { submit, busy: busy || refreshing, error };
}
