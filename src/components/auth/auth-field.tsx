import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };
export function AuthField({ label, error, id, ...props }: Props) {
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <input {...props} id={id} className="field" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : props["aria-describedby"]} />
    {error && <p id={`${id}-error`} className="text-sm text-red-700">{error}</p>}
  </div>;
}
