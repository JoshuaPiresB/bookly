"use client";

import { Heart, Plus } from "lucide-react";
import { useLoginRequired } from "@/components/auth/login-required-provider";

export function GuestBookActions() {
  const { requireLogin } = useLoginRequired();
  return <div className="mt-7">
    <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
      <button type="button" onClick={requireLogin} className="primary-button w-full sm:w-auto"><Plus size={18} />Adicionar à estante</button>
      <button type="button" onClick={requireLogin} className="secondary-button w-full sm:w-auto">Marcar como lido</button>
      <button type="button" onClick={requireLogin} className="secondary-button w-full sm:w-auto"><Heart size={17} />Favoritar</button>
    </div>
    <button type="button" onClick={requireLogin} className="secondary-button mt-3 w-full sm:mt-4 sm:w-auto">Começar leitura</button>
  </div>;
}
