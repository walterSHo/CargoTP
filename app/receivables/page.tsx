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
      <h1 className="text-3xl font-bold">Дебіторська заборгованість</h1>
      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Загальна дебіторка" value={money(total)} />
        <KpiCard title="Прострочена" value={money(overdue)} />
        <KpiCard title="Непрострочена" value={money(sum(receivables.map((row) => row.currentDebt)))} />
        <KpiCard title="Частка прострочки" value={percent(total > 0 ? (overdue / total) * 100 : 0)} />
      </section>
      <ReceivablesClient receivables={receivables} />
    </div>
  );
}
