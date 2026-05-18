export function KpiCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="group rounded-[24px] border border-line bg-[linear-gradient(180deg,rgba(16,28,51,0.94),rgba(11,19,35,0.96))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-[rgba(78,161,255,0.35)]">
      <div className="text-sm font-medium text-muted">{title}</div>
      <div className="mt-3 text-3xl font-black tracking-tight text-white">{value}</div>
      {hint ? <div className="mt-3 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
