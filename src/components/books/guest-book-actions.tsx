"use client";

import { Heart, Plus } from "lucide-react";
import { useLoginRequired } from "@/components/auth/login-required-provider";

export function GuestBookActions() {
  const { requireLogin } = useLoginRequired();
  return <div className="mt-7">
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={requireLogin} className="primary-button"><Plus size={18} />Adicionar à estante</button>
      <button type="button" onClick={requireLogin} className="secondary-button">Marcar como lido</button>
      <button type="button" onClick={requireLogin} className="secondary-button"><Heart size={17} />Favoritar</button>
    </div>
    <button type="button" onClick={requireLogin} className="secondary-button mt-4">Começar leitura</button>
  </div>;
}
