import type { ColumnDef } from '@tanstack/react-table';
import { DailySalesChart, SimpleBarChart, SimplePieChart } from '@/components/Charts';
import { DataTable } from '@/components/DataTable';
import { InfoHint } from '@/components/InfoHint';
import { KpiCard } from '@/components/KpiCard';
import { clientGroupShareGaps, dailySalesSeries, dashboardKpis, groupPlanAudit, latestDataMonth, salesForMonth, topClientsByTurnover, byTop, type ClientGroupGapRow, type TopClientRow } from '@/lib/analytics';
import { EXCLUDED_GROSS_PLAN_GROUP } from '@/lib/constants';
import { readDashboardData } from '@/lib/data';
import { money, percent } from '@/lib/format';

const topClientColumns: ColumnDef<TopClientRow>[] = [
  { accessorKey: 'clientCode', header: 'Код клієнта' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'turnover', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
  {
    accessorKey: 'sharePercent',
    header: () => <InfoHint explanation="Показує, яку частину всього обороту обраного місяця формує цей клієнт." label="Частка місяця" />,
    cell: (info) => percent(Number(info.getValue()))
  }
];

const gapColumns: ColumnDef<ClientGroupGapRow>[] = [
  { accessorKey: 'clientCode', header: 'Код клієнта' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'turnover', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'missingPlanShare', header: 'Втрачена частка плану', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'missingGroups', header: 'Відсутніх груп' },
  {
    accessorFn: (row) => row.missingGroupNames.join(', '),
    id: 'missingGroupNames',
    header: 'Яких груп не вистачає',
    cell: (info) => {
      const value = String(info.getValue() ?? '');
      const preview = value.length > 70 ? `${value.slice(0, 67)}...` : value;
      return <span title={value}>{preview || '—'}</span>;
    }
  }
];

export default function DashboardPage() {
  const data = readDashboardData();
  const month = latestDataMonth(data.sales);

  if (!month) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Огляд дашборду</h1>
        <p className="text-slate-500">Немає оброблених Excel-даних для побудови аналітики.</p>
      </div>
    );
  }

  const monthSales = salesForMonth(data.sales, month);
  const kpis = dashboardKpis(data.sales, data.receivables, data.monthlyPlans, month);
  const topClients = topClientsByTurnover(monthSales, 12);
  const topClientsChart = topClients.slice(0, 8).map((row) => ({ name: row.clientName, value: row.turnover }));
  const groupMix = byTop(monthSales, (row) => row.productGroup, (row) => row.amountEur, 8);
  const daily = dailySalesSeries(monthSales);
  const groupGaps = clientGroupShareGaps(data.groupPlans, monthSales, 12);
  const groupShareTargets = groupPlanAudit(data.groupPlans, monthSales)
    .sort((a, b) => b.shareOfGrossPlan - a.shareOfGrossPlan)
    .map((row) => ({ name: row.productGroup, value: row.shareOfGrossPlan }))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Огляд дашборду</h1>
        <p className="text-slate-500">
          {data.updatedAt ? `Дані оновлено: ${new Date(data.updatedAt).toLocaleString('uk-UA')}` : 'Немає оброблених Excel-даних'}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Загальний оборот" value={money(kpis.totalTurnover)} />
        <KpiCard title={`Оборот без ${EXCLUDED_GROSS_PLAN_GROUP}`} value={money(kpis.planTurnover)} />
        <KpiCard title="Валовий план місяця" value={money(kpis.grossPlan)} hint="Ручне значення для обраного місяця" />
        <KpiCard title="% виконання валового плану" value={percent(kpis.grossPlanCompletion)} />
        <KpiCard title="Середня нетто-маржа" value={percent(kpis.avgNetMargin)} />
        <KpiCard title="Середня знижка" value={percent(kpis.avgDiscount)} />
        <KpiCard title="Прострочена дебіторка" value={money(kpis.overdueDebt)} />
        <KpiCard title="Непрострочена дебіторка" value={money(kpis.currentDebt)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DailySalesChart data={daily} title={`Щоденна динаміка за ${month}`} />
        <SimpleBarChart data={topClientsChart} title="Топ клієнтів за оборотом" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SimplePieChart data={topClientsChart} title="Структура обороту по топ-клієнтах" />
        <SimplePieChart data={groupMix} title="Структура обороту по товарних групах" />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold">Цільові долі груп у валовому плані</h2>
          <p className="text-sm text-slate-500">Це плановий відсоток від обороту, який мають дати групи у валовому плані.</p>
        </div>
        <SimpleBarChart data={groupShareTargets} title="Планові долі груп" valueFormatter={percent} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold">Клієнти, які не закривають планові групи</h2>
          <p className="text-sm text-slate-500">Рейтинг побудований за втраченою часткою планових груп у поточному місяці. Натисніть на рядок, щоб побачити повний список груп.</p>
        </div>
        <DataTable
          columns={gapColumns}
          data={groupGaps}
          initialSorting={[{ id: 'missingPlanShare', desc: true }, { id: 'turnover', desc: true }]}
          maxHeightClassName="max-h-[30rem]"
          renderExpandedRow={(row) => (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800">{row.clientName} ({row.clientCode || row.unifiedClientCode || 'без коду'})</div>
              <div className="text-sm text-slate-600">
                Покрита частка плану: <strong>{percent(row.coveredPlanShare)}</strong>. Втрачена частка: <strong>{percent(row.missingPlanShare)}</strong>.
              </div>
              <div className="text-sm text-slate-600">
                Повний список відсутніх груп: {row.missingGroupNames.join(', ') || '—'}
              </div>
            </div>
          )}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold">Топ клієнтів місяця</h2>
          <p className="text-sm text-slate-500">Тут видно не тільки оборот, а й частку місяця та ширину роботи по групах.</p>
        </div>
        <DataTable columns={topClientColumns} data={topClients} initialSorting={[{ id: 'turnover', desc: true }]} maxHeightClassName="max-h-[30rem]" />
      </section>
    </div>
  );
}
