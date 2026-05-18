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
      <section className="page-hero">
        <div className="eyebrow">Debt watch</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Дебіторська заборгованість</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Швидкий контроль загальної, простроченої та непростроченої дебіторки з акцентом на найбільш ризикових клієнтах.</p>
      </section>
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
