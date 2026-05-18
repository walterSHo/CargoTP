import { TiresClient } from '@/components/TiresClient';
import { KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';
import { latestDataMonth, tireAnalytics } from '@/lib/analytics';
import { readDashboardData } from '@/lib/data';
import { money, percent } from '@/lib/format';

export default function TiresPage() {
  const data = readDashboardData();
  const summary = tireAnalytics(data.sales, data.receivables, latestDataMonth(data.sales));
  return (
    <div className="space-y-6">
      <PageHeader description="Шини аналізуються окремо й не входять до KPI валового плану, тому тут фокус на клієнтській динаміці та ризиковій дебіторці." title="Аналітика шин" />
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
