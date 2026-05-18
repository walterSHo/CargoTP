import { TiresClient } from '@/components/TiresClient';
import { KpiCard } from '@/components/KpiCard';
import { latestDataMonth, tireAnalytics } from '@/lib/analytics';
import { readDashboardData } from '@/lib/data';
import { money, percent } from '@/lib/format';

export default function TiresPage() {
  const data = readDashboardData();
  const summary = tireAnalytics(data.sales, data.receivables, latestDataMonth(data.sales));
  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="eyebrow">Tire segment</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Аналітика шин</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Шини аналізуються окремо й не входять до KPI валового плану, тому тут фокус на клієнтській динаміці та ризиковій дебіторці.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Оборот шин" value={money(summary.turnover)} />
        <KpiCard title="Клієнти шин" value={String(summary.topClients.length)} />
        <KpiCard title="Середня маржа шин" value={percent(summary.avgMargin)} />
        <KpiCard title="Середня знижка шин" value={percent(summary.avgDiscount)} />
      </section>
      <TiresClient summary={summary} />
    </div>
  );
}
