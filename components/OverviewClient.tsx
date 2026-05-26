'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DailySalesChart, SimpleBarChart } from '@/components/Charts';
import { DashboardFilterBar } from '@/components/DashboardFilterBar';
import { DataTable } from '@/components/DataTable';
import { InfoHint } from '@/components/InfoHint';
import { KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';
import { AGGREGATE_PLAN_GROUP, PROFIT_GROUP_NAME } from '@/lib/constants';
import { type DashboardSearchMode } from '@/lib/dashboard-ui';
import { availableMonths, avg, clientGroupShareGaps, dailySalesSeries, dashboardKpis, groupPlanAudit, salesForMonth, topClientsByTurnover, byTop, type ClientGroupGapRow, type TopClientRow } from '@/lib/analytics';
import { money, percent } from '@/lib/format';
import type { ProcessedData, ReceivableRecord, SalesRecord } from '@/lib/types';

type GroupGapMode = 'all' | 'deficit';

function topClientColumns(): ColumnDef<TopClientRow>[] {
  return [
    { accessorKey: 'clientCode', header: 'Код клієнта' },
    { accessorKey: 'clientName', header: 'Клієнт' },
    { accessorKey: 'turnover', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
    {
      accessorKey: 'sharePercent',
      header: () => <InfoHint explanation="Показує, яку частину всього обороту обраного місяця формує цей клієнт." label="Частка місяця" />,
      cell: (info) => percent(Number(info.getValue()))
    }
  ];
}

function gapColumns(): ColumnDef<ClientGroupGapRow>[] {
  return [
    { accessorKey: 'clientCode', header: 'Код клієнта' },
    { accessorKey: 'clientName', header: 'Клієнт' },
    { accessorKey: 'turnover', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
    { accessorKey: 'coveredGroups', header: 'Робить груп', cell: (info) => String(info.getValue() ?? 0) },
    { accessorKey: 'missingPlanShare', header: 'Втрачена частка плану', cell: (info) => percent(Number(info.getValue())) },
    { accessorKey: 'missingGroups', header: 'Відсутніх груп' },
    {
      accessorFn: (row) => row.missingGroupNames.join(', '),
      id: 'missingGroupNames',
      header: 'Яких груп не вистачає',
      cell: (info) => {
        const value = String(info.getValue() ?? '');
        const preview = value.length > 52 ? `${value.slice(0, 49)}...` : value;
        return <span title={value}>{preview || 'Усі групи закриті'}</span>;
      }
    }
  ];
}

function matchesSales(row: SalesRecord, mode: DashboardSearchMode, query: string) {
  if (!query) return true;
  const value = query.toLowerCase();
  if (mode === 'code') return `${row.clientCode} ${row.unifiedClientCode}`.toLowerCase().includes(value);
  if (mode === 'client') return row.clientName.toLowerCase().includes(value);
  if (mode === 'brand') return row.brand.toLowerCase().includes(value);
  if (PROFIT_GROUP_NAME.toLowerCase().includes(value) && row.brand.toLowerCase() === PROFIT_GROUP_NAME.toLowerCase()) return true;
  return row.productGroup.toLowerCase().includes(value);
}

function matchesReceivables(row: ReceivableRecord, mode: DashboardSearchMode, query: string) {
  if (!query) return true;
  const value = query.toLowerCase();
  if (mode === 'code') return `${row.clientCode} ${row.unifiedClientCode}`.toLowerCase().includes(value);
  if (mode === 'client') return row.clientName.toLowerCase().includes(value);
  return false;
}

function suggestionValues(data: ProcessedData, mode: DashboardSearchMode) {
  const values = new Set<string>();
  if (mode === 'code') {
    [...data.sales, ...data.receivables].forEach((row) => {
      if (row.clientCode) values.add(row.clientCode);
      if (row.unifiedClientCode) values.add(row.unifiedClientCode);
    });
  }
  if (mode === 'client') [...data.sales, ...data.receivables].forEach((row) => row.clientName && values.add(row.clientName));
  if (mode === 'brand') data.sales.forEach((row) => row.brand && values.add(row.brand));
  if (mode === 'group') {
    data.sales.forEach((row) => {
      if (row.productGroup) values.add(row.productGroup);
      if (row.brand.toLowerCase() === PROFIT_GROUP_NAME.toLowerCase()) values.add(PROFIT_GROUP_NAME);
    });
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' }));
}

export function OverviewClient({ data }: { data: ProcessedData }) {
  const months = availableMonths(data.sales).sort().reverse();
  const [month, setMonth] = useState(months[0] ?? '');
  const [searchMode, setSearchMode] = useState<DashboardSearchMode>('code');
  const [query, setQuery] = useState('');
  const [groupGapMode, setGroupGapMode] = useState<GroupGapMode>('all');

  if (!month) {
    return (
      <PageHeader description="Немає оброблених Excel-даних для побудови аналітики." title="Огляд дашборду" />
    );
  }

  const monthSales = salesForMonth(data.sales, month).filter((row) => matchesSales(row, searchMode, query));
  const visibleClientKeys = new Set(monthSales.map((row) => row.clientCode || row.unifiedClientCode || row.clientName));
  const receivables = data.receivables.filter((row) => {
    if (searchMode === 'brand' || searchMode === 'group') {
      return !query || visibleClientKeys.has(row.clientCode || row.unifiedClientCode || row.clientName);
    }

    return matchesReceivables(row, searchMode, query);
  });
  const kpis = dashboardKpis(monthSales, receivables, data.monthlyPlans, month);
  const topClients = topClientsByTurnover(monthSales, 12);
  const topClientsChart = topClients.slice(0, 8).map((row) => ({ name: row.clientName, value: row.turnover }));
  const daily = dailySalesSeries(monthSales);
  const groupGaps = clientGroupShareGaps(data.groupPlans, monthSales);
  const visibleGroupGaps = groupGapMode === 'deficit' ? groupGaps.filter((row) => row.missingGroups > 0) : groupGaps;
  const groupShareTargets = groupPlanAudit(data.groupPlans, monthSales)
    .filter((row) => row.productGroup !== AGGREGATE_PLAN_GROUP)
    .map((row) => ({
      name: row.productGroup,
      turnover: row.factFromSales,
      turnoverShare: kpis.totalTurnover > 0 ? (row.factFromSales / kpis.totalTurnover) * 100 : 0,
      targetShare: row.productGroup === PROFIT_GROUP_NAME ? row.planPercent : row.shareOfGrossPlan,
      completionPercent: row.completionPercent
    }))
    .sort((a, b) => b.targetShare - a.targetShare || b.turnover - a.turnover)
    .slice(0, 12);
  const activeClients = new Set(monthSales.map((row) => row.clientCode || row.unifiedClientCode || row.clientName)).size;
  const avgDailyTurnover = daily.length ? avg(daily.map((row) => row.turnover)) : 0;
  const topOverdueClients = byTop(receivables.filter((row) => row.overdueDebt > 0), (row) => row.clientName, (row) => row.overdueDebt, 8);
  const share31Plus = receivables.length
    ? (receivables.reduce((total, row) => total + row.bucket31Plus, 0) / Math.max(receivables.reduce((total, row) => total + row.totalDebt, 0), 1)) * 100
    : 0;
  const suggestions = suggestionValues(data, searchMode);
  const completionTone = kpis.grossPlanCompletion >= 100 ? 'success' : kpis.grossPlanCompletion >= 85 ? 'warning' : 'danger';
  const debtTone = kpis.overdueDebt > 0 ? 'danger' : 'success';
  const suggestionGridClassName = searchMode === 'group' || searchMode === 'brand'
    ? 'sm:grid-cols-2 xl:grid-cols-3'
    : 'sm:grid-cols-2';

  return (
    <div className="space-y-6">
      <PageHeader
        aside={(
          <div className="soft-panel p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Стан даних</div>
            <div className="mt-2 text-sm text-white">Оновлено: {data.updatedAt ? new Date(data.updatedAt).toLocaleString('uk-UA') : 'немає мітки часу'}</div>
            <div className="mt-2 text-sm text-muted">Активний місяць: <span className="font-semibold text-white">{month}</span></div>
          </div>
        )}
        description="Більш контрастний робочий екран для щоденного контролю обороту, планових долей груп, дебіторки та ризикових клієнтів."
        kicker="Operations overview"
        title="Огляд дашборду"
      />

      <section className="metric-strip motion-fade-up">
        <div className="metric-strip-item">
          <div className="metric-strip-label">Валовий план</div>
          <div className="metric-strip-value">{percent(kpis.grossPlanCompletion)}</div>
          <div className="metric-strip-copy">Активний місяць: {month}</div>
        </div>
        <div className="metric-strip-item">
          <div className="metric-strip-label">Прострочка</div>
          <div className="metric-strip-value">{money(kpis.overdueDebt)}</div>
          <div className="metric-strip-copy">Поточний ризик оплат</div>
        </div>
        <div className="metric-strip-item">
          <div className="metric-strip-label">Cross-sell резерв</div>
          <div className="metric-strip-value">{visibleGroupGaps.filter((row) => row.missingGroups > 0).length}</div>
          <div className="metric-strip-copy">Клієнтів з незакритими плановими групами</div>
        </div>
      </section>

      <DashboardFilterBar
        month={month}
        months={months}
        onMonthChange={setMonth}
        onQueryChange={setQuery}
        onSearchModeChange={setSearchMode}
        query={query}
        searchMode={searchMode}
        suggestionGridClassName={suggestionGridClassName}
        suggestions={suggestions}
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard hint={`Валовий оборот за ${month}`} title="Загальний оборот" tone="info" value={money(kpis.totalTurnover)} />
        <KpiCard hint={`Планова база: ${money(kpis.planTurnover)} з планом ${money(kpis.grossPlan)}`} title="Виконання валового плану" tone={completionTone} value={percent(kpis.grossPlanCompletion)} />
        <KpiCard hint={`31+ днів: ${percent(share31Plus)} від усієї дебіторки`} title="Прострочена дебіторка" tone={debtTone} value={money(kpis.overdueDebt)} />
        <KpiCard hint={`Середній день: ${money(avgDailyTurnover)}`} title="Активні клієнти" tone="secondary" value={String(activeClients)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DailySalesChart data={daily} title={`Щоденна динаміка за ${month}`} />
        <SimpleBarChart data={topClientsChart} title="Топ клієнтів за оборотом" valueLabel="Оборот" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-[var(--ink)]">Планові долі груп</div>
          <div className="text-xs text-muted">Показуємо реальну долю від обороту та ціль по кожній групі, включно з окремою групою PROFIT.</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {groupShareTargets.map((row) => (
              <div className="soft-panel interactive-lift px-3 py-3" key={row.name}>
                <div className="truncate text-[13px] font-semibold text-white" title={row.name}>{row.name}</div>
                <div className="mt-1 text-[11px] leading-4 text-muted">
                  {money(row.turnover)} · {percent(row.turnoverShare)} · {percent(row.targetShare)}
                </div>
                <div className="mt-3 h-2 overflow-hidden bg-[rgba(224,216,198,0.12)]">
                  <div className="h-full bg-[var(--accent)] transition-all duration-300 ease-out" style={{ width: `${Math.min(row.completionPercent, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <SimpleBarChart barColor="#c96b5d" data={topOverdueClients} title="Топ клієнтів за прострочкою" valueLabel="Прострочка" />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="section-title text-white">Клієнти, які не закривають планові групи</h2>
          <p className="section-copy text-sm">Перемикайте список між усіма клієнтами місяця та лише тими, у кого є дефіцит по планових групах. Натисніть на рядок, щоб побачити покриття детально.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`strict-button ${groupGapMode === 'all' ? 'strict-button-active' : ''}`}
            onClick={() => setGroupGapMode('all')}
            type="button"
          >
            Усі клієнти
          </button>
          <button
            className={`strict-button ${groupGapMode === 'deficit' ? 'strict-button-active' : ''}`}
            onClick={() => setGroupGapMode('deficit')}
            type="button"
          >
            Тільки з дефіцитом
          </button>
        </div>
        <DataTable
          columns={gapColumns()}
          data={visibleGroupGaps}
          initialSorting={[{ id: 'missingPlanShare', desc: true }, { id: 'turnover', desc: true }]}
          renderExpandedRow={(row) => (
            <div className="soft-panel space-y-4 p-4">
              <div className="text-sm font-semibold text-white">{row.clientName} ({row.clientCode || row.unifiedClientCode || 'без коду'})</div>
              <div className="text-sm text-muted">
                Покрита частка плану: <strong className="text-white">{percent(row.coveredPlanShare)}</strong>. Втрачена частка: <strong className="text-white">{percent(row.missingPlanShare)}</strong>.
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted">Групи, які клієнт вже робить:</div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {[...row.coveredGroupStats, ...row.coveredBrandStats.map((brand) => ({ ...brand, planShare: null }))].map((item) => (
                    <div className="border border-line bg-[var(--panel)] px-3 py-2" key={item.name}>
                      <div className="text-sm font-semibold text-white">{item.name}</div>
                      <div className="mt-1 text-[10px] leading-4 text-muted">
                        {money(item.amount)} · {percent(item.turnoverShare)}
                        {'planShare' in item && typeof item.planShare === 'number' ? ` · ${percent(item.planShare)}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted">Групи, яких не вистачає:</div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {row.missingGroupStats.length ? row.missingGroupStats.map((item) => (
                    <div className="border border-line bg-[rgba(199,181,138,0.08)] px-3 py-2" key={item.name}>
                      <div className="text-sm font-semibold text-white">{item.name}</div>
                      <div className="mt-1 text-[10px] leading-4 text-muted">{percent(item.planShare)}</div>
                    </div>
                  )) : (
                    <div className="border border-line bg-[rgba(120,166,106,0.1)] px-3 py-2 text-sm text-white">Усі планові групи вже закриті</div>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="section-title text-white">Топ клієнтів місяця</h2>
          <p className="section-copy text-sm">Деталізацію по брендах і групах залишаємо в таблицях нижче по сторінках, щоб overview залишався коротким і робочим.</p>
        </div>
        <DataTable columns={topClientColumns()} data={topClients} initialSorting={[{ id: 'turnover', desc: true }]} />
      </section>
    </div>
  );
}
