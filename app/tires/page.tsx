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
      <div>
        <h1 className="text-3xl font-bold">Tire Analytics</h1>
        <p className="text-slate-500">Шины анализируются отдельно и не входят в KPI валового плана.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Оборот шин" value={money(summary.turnover)} />
        <KpiCard title="Клиенты шин" value={String(summary.topClients.length)} />
        <KpiCard title="Средняя маржа шин" value={percent(summary.avgMargin)} />
        <KpiCard title="Средняя скидка шин" value={percent(summary.avgDiscount)} />
      </section>
      <TiresClient summary={summary} />
    </div>
  );
}
