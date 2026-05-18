import { ReceivablesClient } from '@/components/ReceivablesClient';
import { KpiCard } from '@/components/KpiCard';
import { sum } from '@/lib/analytics';
import { readDashboardData } from '@/lib/data';
import { money, percent } from '@/lib/format';

export default function ReceivablesPage() {
  const { receivables } = readDashboardData();
  const total = sum(receivables.map((row) => row.totalDebt));
  const overdue = sum(receivables.map((row) => row.overdueDebt));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Receivables</h1>
      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Общая дебиторка" value={money(total)} />
        <KpiCard title="Просроченная" value={money(overdue)} />
        <KpiCard title="Непросроченная" value={money(sum(receivables.map((row) => row.currentDebt)))} />
        <KpiCard title="Доля просрочки" value={percent(total > 0 ? (overdue / total) * 100 : 0)} />
      </section>
      <ReceivablesClient receivables={receivables} />
    </div>
  );
}
