import { KpiCard } from '@/components/KpiCard';
import { SimpleBarChart } from '@/components/Charts';
import { dashboardKpis, byTop, salesForMonth } from '@/lib/analytics';
import { DEFAULT_MONTH, EXCLUDED_GROSS_PLAN_GROUP } from '@/lib/constants';
import { readDashboardData } from '@/lib/data';
import { money, percent } from '@/lib/format';

export default function DashboardPage() {
  const data = readDashboardData();
  const kpis = dashboardKpis(data.sales, data.receivables, data.monthlyPlans, DEFAULT_MONTH);
  const monthSales = salesForMonth(data.sales, DEFAULT_MONTH);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-slate-500">Данные обновлены: {new Date(data.updatedAt).toLocaleString('ru-RU')}</p>
      </div>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Общий оборот" value={money(kpis.totalTurnover)} />
        <KpiCard title={`Оборот без ${EXCLUDED_GROSS_PLAN_GROUP}`} value={money(kpis.planTurnover)} />
        <KpiCard title="Валовый план месяца" value={money(kpis.grossPlan)} hint="Ручной ввод по месяцу" />
        <KpiCard title="% выполнения валового плана" value={percent(kpis.grossPlanCompletion)} />
        <KpiCard title="Средняя нетто-маржа" value={percent(kpis.avgNetMargin)} />
        <KpiCard title="Средний % скидки" value={percent(kpis.avgDiscount)} />
        <KpiCard title="Просроченная дебиторка" value={money(kpis.overdueDebt)} />
        <KpiCard title="Непросроченная дебиторка" value={money(kpis.currentDebt)} />
      </section>
      <SimpleBarChart data={byTop(monthSales, (row) => row.productGroup, (row) => row.amountEur, 8)} />
    </div>
  );
}
