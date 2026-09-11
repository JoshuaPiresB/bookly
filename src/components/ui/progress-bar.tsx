export function ProgressBar({ value, label }: { value: number; label: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return <div className="w-full">
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safeValue)}>
      <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${safeValue}%` }} />
    </div>
  </div>;
}
