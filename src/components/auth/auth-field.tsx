import type { InputHTMLAttributes } from "react";
import { LockKeyhole, Mail, UserRound } from "lucide-react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };
export function AuthField({ label, error, id, ...props }: Props) {
  const Icon = props.type === "email" ? Mail : props.type === "password" ? LockKeyhole : UserRound;
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>
    <div className="relative">
      <Icon aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input {...props} id={id} className="field h-[50px] rounded-xl border-slate-300 pl-11 transition-[border-color,box-shadow] hover:border-slate-400 focus:border-brand focus:shadow-[0_0_0_3px_rgba(20,115,230,0.10)]" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : props["aria-describedby"]} />
    </div>
    {error && <p id={`${id}-error`} className="text-sm text-red-700">{error}</p>}
  </div>;
}
