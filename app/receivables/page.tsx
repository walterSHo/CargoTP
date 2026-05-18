import { ReceivablesClient } from '@/components/ReceivablesClient';
import { KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';
import { sum } from '@/lib/analytics';
import { readDashboardData } from '@/lib/data';
import { money, percent } from '@/lib/format';

export default function ReceivablesPage() {
  const { receivables } = readDashboardData();
  const total = sum(receivables.map((row) => row.totalDebt));
  const overdue = sum(receivables.map((row) => row.overdueDebt));
  const bucket0To10 = sum(receivables.map((row) => row.bucket0To10));
  const bucket11To20 = sum(receivables.map((row) => row.bucket11To20));
  const bucket21To30 = sum(receivables.map((row) => row.bucket21To30));
  const bucket31Plus = sum(receivables.map((row) => row.bucket31Plus));
  return (
    <div className="space-y-6">
      <PageHeader description="Швидкий контроль загальної, простроченої та непростроченої дебіторки з акцентом на найбільш ризикових клієнтах." title="Дебіторська заборгованість" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Загальна дебіторка" value={money(total)} />
        <KpiCard title="Прострочена" value={money(overdue)} />
        <KpiCard title="Непрострочена" value={money(sum(receivables.map((row) => row.currentDebt)))} />
        <KpiCard title="Частка прострочки" value={percent(total > 0 ? (overdue / total) * 100 : 0)} />
        <KpiCard title="0–10 днів" value={money(bucket0To10)} />
        <KpiCard title="11–20 днів" value={money(bucket11To20)} />
        <KpiCard title="21–30 днів" value={money(bucket21To30)} />
        <KpiCard title="31+ днів" value={money(bucket31Plus)} />
      </section>
      <ReceivablesClient receivables={receivables} />
    </div>
  );
}
