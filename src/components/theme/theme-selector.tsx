"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "bookly-theme";
const CHANGE_EVENT = "bookly-theme-change";

const options = [
  { value: "system", label: "Sistema", description: "Acompanha o tema do seu dispositivo.", icon: Laptop },
  { value: "light", label: "Claro", description: "Mantém o Bookly sempre no modo claro.", icon: Sun },
  { value: "dark", label: "Escuro", description: "Mantém o Bookly sempre no modo escuro.", icon: Moon },
] satisfies Array<{ value: ThemePreference; label: string; description: string; icon: typeof Sun }>;

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  } catch {
    return "system";
  }
}

function resolveTheme(preference: ThemePreference) {
  return preference === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
}

function applyResolvedTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#08111f" : "#f8fafc");
}

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    applyResolvedTheme(readPreference());
    callback();
  };
  window.addEventListener("storage", sync);
  window.addEventListener(CHANGE_EVENT, sync);
  media.addEventListener("change", sync);
  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener(CHANGE_EVENT, sync);
    media.removeEventListener("change", sync);
  };
}

function selectTheme(preference: ThemePreference) {
  try { localStorage.setItem(STORAGE_KEY, preference); } catch { /* The theme still changes when storage is unavailable. */ }
  applyResolvedTheme(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ThemeSelector() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system");

  return <div role="radiogroup" aria-label="Tema da aplicação" className="mt-5 grid gap-3 sm:grid-cols-3">
    {options.map(({ value, label, description, icon: Icon }) => {
      const selected = preference === value;
      return <button key={value} type="button" role="radio" aria-checked={selected} onClick={() => selectTheme(value)} className={`relative flex min-h-32 flex-col items-start rounded-xl border p-4 text-left transition-[border-color,background-color,box-shadow] ${selected ? "border-brand bg-soft ring-1 ring-brand" : "border-line bg-panel hover:border-strong hover:bg-hover"}`}>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-action text-white" : "bg-recessed text-muted"}`}><Icon size={19} aria-hidden="true" /></span>
        <span className="mt-4 font-semibold text-ink">{label}</span>
        <span className="mt-1 text-xs leading-5 text-muted">{description}</span>
        {selected && <Check className="absolute right-3 top-3 text-brand" size={18} aria-hidden="true" />}
      </button>;
    })}
  </div>;
}
