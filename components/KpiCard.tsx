import type { ReactNode } from 'react';
import { BarChartIcon, CircleAlertIcon, GaugeIcon, NetworkIcon, PercentIcon, WalletIcon } from '@/components/UiIcons';

type KpiTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'teal';

function iconForTitle(title: string): ReactNode {
  const normalized = title.toLowerCase();
  if (normalized.includes('дебітор')) return <WalletIcon className="h-[18px] w-[18px]" />;
  if (normalized.includes('profit') || normalized.includes('маржа')) return <PercentIcon className="h-[18px] w-[18px]" />;
  if (normalized.includes('темп') || normalized.includes('день')) return <GaugeIcon className="h-[18px] w-[18px]" />;
  if (normalized.includes('клієнт') || normalized.includes('cross-sell')) return <NetworkIcon className="h-[18px] w-[18px]" />;
  if (normalized.includes('план')) return <CircleAlertIcon className="h-[18px] w-[18px]" />;
  return <BarChartIcon className="h-[18px] w-[18px]" />;
}

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
    <div className={`kpi-card interactive-lift motion-fade-up kpi-card-${tone}`}>
      <div className="kpi-card-shell">
        <div className="kpi-card-head">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{title}</div>
          <div className="kpi-icon">{iconForTitle(title)}</div>
        </div>
        <div className="mt-2.5 text-[26px] font-black leading-none tracking-[-0.03em] text-white">{value}</div>
        {hint ? <div className="mt-2.5 text-xs leading-5 text-muted">{hint}</div> : null}
      </div>
    </div>
  );
}
