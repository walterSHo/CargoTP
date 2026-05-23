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
  const riskClients = receivables.filter((row) => row.overdueDebt > 0).length;
  const share31Plus = total > 0 ? (bucket31Plus / total) * 100 : 0;
  return (
    <div className="space-y-6">
      <PageHeader description="Швидкий контроль загальної, простроченої та непростроченої дебіторки з акцентом на найбільш ризикових клієнтах." kicker="Payment pressure" title="Дебіторська заборгованість" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard hint="Уся сума по клієнтській дебіторці" title="Загальна дебіторка" tone="info" value={money(total)} />
        <KpiCard hint={`${riskClients} клієнтів мають прострочення`} title="Прострочена" tone={overdue > 0 ? 'danger' : 'success'} value={money(overdue)} />
        <KpiCard hint="Сума без прострочення" title="Непрострочена" tone="teal" value={money(sum(receivables.map((row) => row.currentDebt)))} />
        <KpiCard hint="Частка 31+ від усієї дебіторки" title="31+ у структурі" tone={share31Plus >= 25 ? 'danger' : share31Plus >= 10 ? 'warning' : 'success'} value={percent(share31Plus)} />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="0–10 днів" tone="success" value={money(bucket0To10)} />
        <KpiCard title="11–20 днів" tone="teal" value={money(bucket11To20)} />
        <KpiCard title="21–30 днів" tone="warning" value={money(bucket21To30)} />
        <KpiCard title="31+ днів" tone="danger" value={money(bucket31Plus)} />
      </section>
      <ReceivablesClient receivables={receivables} />
    </div>
  );
}
