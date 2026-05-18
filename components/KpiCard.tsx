type KpiTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'teal';

export function KpiCard({
  title,
  value,
  hint,
  tone = 'neutral'
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: KpiTone;
}) {
  return (
    <div className={`kpi-card kpi-card-${tone}`}>
      <div className="pl-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{title}</div>
        <div className="mt-3 text-[30px] font-black leading-none tracking-[-0.03em] text-white">{value}</div>
        {hint ? <div className="mt-3 text-xs leading-5 text-muted">{hint}</div> : null}
      </div>
    </div>
  );
}
