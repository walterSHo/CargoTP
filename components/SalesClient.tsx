'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DailySalesChart, SimpleBarChart } from './Charts';
import { DashboardFilterBar } from './DashboardFilterBar';
import { DataTable } from './DataTable';
import { KpiCard } from './KpiCard';
import { AGGREGATE_PLAN_GROUP, PROFIT_GROUP_NAME, PROFIT_PLAN_PERCENT } from '@/lib/constants';
import { type DashboardSearchMode } from '@/lib/dashboard-ui';
import {
  availableMonths,
  byTop,
  clientGroupShareGaps,
  dailySalesSeries,
  dashboardKpis,
  groupPlanAudit,
  groupTempoRows,
  monthPaceSnapshot,
  profitClientPenetration,
  profitGroupPenetration,
  salesForMonth,
  topClientsByTurnover,
  type ClientGroupGapRow,
  type GroupTempoRow,
  type ProfitClientPenetrationRow,
  type ProfitGroupPenetrationRow
} from '@/lib/analytics';
import { money, percent } from '@/lib/format';
import { normalizeProductGroup } from '@/lib/product-groups';
import type { ProcessedData, SalesRecord } from '@/lib/types';

type ActionSignal = {
  title: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'secondary';
  description: string;
};

type QuickFocus = 'all' | 'lagging' | 'riskMargin' | 'overdue' | 'noProfit';

const quickFocusOptions: Array<{ value: QuickFocus; label: string }> = [
  { value: 'all', label: 'Усі' },
  { value: 'lagging', label: 'Відстають' },
  { value: 'riskMargin', label: 'Ризик маржі' },
  { value: 'overdue', label: 'Є прострочка' },
  { value: 'noProfit', label: 'Без PROFIT' }
];

const salesColumns: ColumnDef<SalesRecord>[] = [
  { accessorKey: 'date', header: 'Дата' },
  { accessorKey: 'unifiedClientCode', header: 'Єдиний код' },
  { accessorKey: 'clientCode', header: 'Код клієнта' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'brand', header: 'Бренд' },
  { accessorKey: 'productGroup', header: 'Група' },
  { accessorKey: 'productCode', header: 'Товар' },
  { accessorKey: 'amountEur', header: 'Сума', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'netMargin', header: 'Нетто-маржа', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'discountPercent', header: 'Знижка', cell: (info) => percent(Number(info.getValue())) }
];

const opportunityColumns: ColumnDef<ClientGroupGapRow>[] = [
  { accessorKey: 'clientCode', header: 'Код клієнта' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'turnover', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'missingPlanShare', header: 'Втрачена частка плану', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'missingGroups', header: 'Немає груп' },
  {
    accessorFn: (row) => row.missingGroupNames.join(', '),
    id: 'missingGroupNames',
    header: 'Що відкрити',
    cell: (info) => {
      const value = String(info.getValue() ?? '');
      const preview = value.length > 52 ? `${value.slice(0, 49)}...` : value;
      return <span title={value}>{preview || 'Усі групи закриті'}</span>;
    }
  }
];

const riskColumns: ColumnDef<SalesRecord>[] = [
  { accessorKey: 'date', header: 'Дата' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'brand', header: 'Бренд' },
  { accessorKey: 'productGroup', header: 'Група' },
  { accessorKey: 'amountEur', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'netMargin', header: 'Маржа', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'discountPercent', header: 'Знижка', cell: (info) => percent(Number(info.getValue())) }
];

const groupTempoColumns: ColumnDef<GroupTempoRow>[] = [
  { accessorKey: 'productGroup', header: 'Група' },
  { accessorKey: 'planPercent', header: 'План %', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'tempoCompletionPercent', header: 'Темп %', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'tempoAmount', header: 'Темп сума', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'factFromSales', header: 'Факт', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'tempoDelta', header: 'Факт - темп', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'requiredPerDay', header: 'Треба / день', cell: (info) => money(Number(info.getValue())) }
];

const profitClientColumns: ColumnDef<ProfitClientPenetrationRow>[] = [
  { accessorKey: 'clientCode', header: 'Код клієнта' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'turnover', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'profitTurnover', header: 'PROFIT оборот', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'profitShare', header: 'PROFIT %', cell: (info) => percent(Number(info.getValue())) },
  {
    accessorKey: 'hasProfit',
    header: 'Статус',
    cell: (info) => Number(info.getValue()) ? 'Є PROFIT' : 'Немає PROFIT'
  }
];

const profitGroupColumns: ColumnDef<ProfitGroupPenetrationRow>[] = [
  { accessorKey: 'productGroup', header: 'Група' },
  { accessorKey: 'clients', header: 'Клієнтів' },
  { accessorKey: 'clientsWithProfit', header: 'З PROFIT' },
  { accessorKey: 'penetrationPercent', header: 'Покриття %', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'potentialTurnover', header: 'Потенціал без PROFIT', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'turnover', header: 'Оборот групи', cell: (info) => money(Number(info.getValue())) }
];

function matchesSales(row: SalesRecord, mode: DashboardSearchMode, query: string) {
  if (!query) return true;
  const value = query.toLowerCase();
  if (mode === 'code') return `${row.clientCode} ${row.unifiedClientCode}`.toLowerCase().includes(value);
  if (mode === 'client') return row.clientName.toLowerCase().includes(value);
  if (mode === 'brand') return row.brand.toLowerCase().includes(value);
  if (normalizeProductGroup(PROFIT_GROUP_NAME).includes(normalizeProductGroup(value)) && normalizeProductGroup(row.brand) === normalizeProductGroup(PROFIT_GROUP_NAME)) return true;
  return row.productGroup.toLowerCase().includes(value);
}

function suggestionValues(data: ProcessedData, mode: DashboardSearchMode) {
  const values = new Set<string>();
  if (mode === 'code') {
    data.sales.forEach((row) => {
      if (row.clientCode) values.add(row.clientCode);
      if (row.unifiedClientCode) values.add(row.unifiedClientCode);
    });
  }
  if (mode === 'client') data.sales.forEach((row) => row.clientName && values.add(row.clientName));
  if (mode === 'brand') data.sales.forEach((row) => row.brand && values.add(row.brand));
  if (mode === 'group') {
    data.sales.forEach((row) => {
      if (row.productGroup) values.add(row.productGroup);
      if (normalizeProductGroup(row.brand) === normalizeProductGroup(PROFIT_GROUP_NAME)) values.add(PROFIT_GROUP_NAME);
    });
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' }));
}

function applyColumnFilters(rows: SalesRecord[], filters: Record<string, string[]>) {
  const keys = salesColumns
    .map((column) => ('accessorKey' in column && typeof column.accessorKey === 'string' ? column.accessorKey : ''))
    .filter(Boolean);

  return rows.filter((row) => keys.every((key) => {
    const selected = filters[key];
    if (!selected?.length) return true;
    return selected.includes(String(row[key as keyof SalesRecord] ?? ''));
  }));
}

export function SalesClient({ data }: { data: ProcessedData }) {
  const months = availableMonths(data.sales).sort().reverse();
  const [month, setMonth] = useState(months[0] ?? '');
  const [searchMode, setSearchMode] = useState<DashboardSearchMode>('code');
  const [query, setQuery] = useState('');
  const [quickFocus, setQuickFocus] = useState<QuickFocus>('all');
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const suggestions = useMemo(() => suggestionValues(data, searchMode), [data, searchMode]);
  const searchedSales = useMemo(
    () => salesForMonth(data.sales, month).filter((row) => matchesSales(row, searchMode, query)),
    [data.sales, month, query, searchMode]
  );
  const focusedSales = useMemo(() => {
    if (quickFocus === 'all') return searchedSales;
    if (quickFocus === 'noProfit') {
      const clientsWithProfit = new Set(searchedSales.filter((row) => normalizeProductGroup(row.brand) === normalizeProductGroup(PROFIT_GROUP_NAME)).map((row) => row.clientCode || row.unifiedClientCode || row.clientName));
      return searchedSales.filter((row) => !clientsWithProfit.has(row.clientCode || row.unifiedClientCode || row.clientName));
    }
    if (quickFocus === 'overdue') {
      const overdueClients = new Set(data.receivables.filter((row) => row.overdueDebt > 0).map((row) => row.clientCode || row.unifiedClientCode || row.clientName));
      return searchedSales.filter((row) => overdueClients.has(row.clientCode || row.unifiedClientCode || row.clientName));
    }
    if (quickFocus === 'riskMargin') {
      const avgMarginValue = searchedSales.length ? searchedSales.reduce((sum, row) => sum + row.netMargin, 0) / searchedSales.length : 0;
      const avgDiscountValue = searchedSales.length ? searchedSales.reduce((sum, row) => sum + row.discountPercent, 0) / searchedSales.length : 0;
      const discountLimit = Math.max(avgDiscountValue, 8);
      const marginLimit = avgMarginValue > 0 ? Math.min(avgMarginValue, PROFIT_PLAN_PERCENT + 3) : PROFIT_PLAN_PERCENT + 3;
      return searchedSales.filter((row) => row.discountPercent >= discountLimit || row.netMargin <= marginLimit);
    }
    const laggingClients = new Set(clientGroupShareGaps(data.groupPlans, searchedSales).filter((row) => row.missingGroups > 0).map((row) => row.clientCode || row.unifiedClientCode || row.clientName));
    return searchedSales.filter((row) => laggingClients.has(row.clientCode || row.unifiedClientCode || row.clientName));
  }, [data.groupPlans, data.receivables, quickFocus, searchedSales]);
  const visibleSales = useMemo(() => applyColumnFilters(focusedSales, filters), [focusedSales, filters]);
  const kpis = useMemo(() => dashboardKpis(visibleSales, [], data.monthlyPlans, month), [data.monthlyPlans, month, visibleSales]);
  const monthPace = useMemo(() => monthPaceSnapshot(visibleSales, data.monthlyPlans, month), [data.monthlyPlans, month, visibleSales]);
  const topClients = useMemo(() => topClientsByTurnover(visibleSales, 10), [visibleSales]);
  const topClientsChart = useMemo(() => topClients.slice(0, 8).map((row) => ({ name: row.clientName, value: row.turnover })), [topClients]);
  const topBrandsChart = useMemo(() => byTop(visibleSales, (row) => row.brand || 'Без бренду', (row) => row.amountEur, 8), [visibleSales]);
  const topGroupsChart = useMemo(() => byTop(visibleSales, (row) => row.productGroup || 'Без групи', (row) => row.amountEur, 8), [visibleSales]);
  const daily = useMemo(() => dailySalesSeries(visibleSales), [visibleSales]);
  const groupGaps = useMemo(() => clientGroupShareGaps(data.groupPlans, visibleSales), [data.groupPlans, visibleSales]);
  const deficitClients = useMemo(() => groupGaps.filter((row) => row.missingGroups > 0), [groupGaps]);
  const groupShareTargets = useMemo(() => groupPlanAudit(data.groupPlans, visibleSales)
    .filter((row) => row.productGroup !== AGGREGATE_PLAN_GROUP)
    .map((row) => ({
      name: row.productGroup,
      turnover: row.factFromSales,
      targetShare: row.productGroup === PROFIT_GROUP_NAME ? row.planPercent : row.shareOfGrossPlan
    }))
    .sort((a, b) => b.turnover - a.turnover || b.targetShare - a.targetShare)
    .slice(0, 6), [data.groupPlans, visibleSales]);
  const plannedGroupBars = useMemo(() => groupShareTargets.map((row) => ({ name: row.name, value: row.turnover })).filter((row) => row.value > 0), [groupShareTargets]);
  const tempoRows = useMemo(() => groupTempoRows(data.groupPlans, visibleSales, month), [data.groupPlans, month, visibleSales]);
  const profitClients = useMemo(() => profitClientPenetration(visibleSales, 12), [visibleSales]);
  const profitGroups = useMemo(() => profitGroupPenetration(visibleSales, 10), [visibleSales]);

  const profitTurnover = useMemo(
    () => visibleSales.filter((row) => normalizeProductGroup(row.brand) === normalizeProductGroup(PROFIT_GROUP_NAME)).reduce((sum, row) => sum + row.amountEur, 0),
    [visibleSales]
  );
  const profitShare = kpis.totalTurnover > 0 ? (profitTurnover / kpis.totalTurnover) * 100 : 0;
  const profitGap = Math.max(PROFIT_PLAN_PERCENT - profitShare, 0);
  const avgMargin = kpis.avgNetMargin;
  const avgDiscount = kpis.avgDiscount;
  const discountThreshold = Math.max(avgDiscount, 8);
  const marginThreshold = avgMargin > 0 ? Math.min(avgMargin, PROFIT_PLAN_PERCENT + 3) : PROFIT_PLAN_PERCENT + 3;
  const riskyRows = useMemo(() => [...visibleSales]
    .filter((row) => row.discountPercent >= discountThreshold || row.netMargin <= marginThreshold)
    .sort((left, right) => (right.discountPercent - left.discountPercent) || (left.netMargin - right.netMargin) || (right.amountEur - left.amountEur))
    .slice(0, 12), [discountThreshold, marginThreshold, visibleSales]);
  const discountPressureTurnover = riskyRows.reduce((sum, row) => sum + row.amountEur, 0);
  const concentrationShare = topClients.length
    ? (topClients.slice(0, 3).reduce((sum, row) => sum + row.turnover, 0) / Math.max(kpis.totalTurnover, 1)) * 100
    : 0;

  const actionSignals: ActionSignal[] = [
    {
      title: 'PROFIT vs ціль',
      value: `${percent(profitShare)} / ${percent(PROFIT_PLAN_PERCENT)}`,
      tone: profitGap > 0 ? 'warning' : 'success',
      description: profitGap > 0
        ? `Бракує ${percent(profitGap)} до цілі PROFIT. Найкраще тиснути через клієнтів і групи з низьким покриттям.`
        : 'Ціль PROFIT виконана. Можна утримувати частку та переносити фокус на інші резерви.'
    },
    {
      title: 'Резерв допродажу',
      value: `${deficitClients.length} клієнтів`,
      tone: deficitClients.length ? 'secondary' : 'success',
      description: deficitClients.length
        ? `${deficitClients[0]?.clientName || 'Клієнт'} має найбільший дефіцит по планових групах. Це швидкий резерв росту.`
        : 'У видимому зрізі активні клієнти вже добре закривають планові групи.'
    },
    {
      title: 'Темп місяця',
      value: money(monthPace.varianceToTempo),
      tone: monthPace.varianceToTempo >= 0 ? 'success' : 'warning',
      description: `На зараз пройдено ${percent(monthPace.elapsedShare * 100)} місяця. Порівняння йде з очікуваним оборотом до сьогодні.`
    },
    {
      title: 'Середня знижка',
      value: percent(avgDiscount),
      tone: avgDiscount >= 8 ? 'warning' : 'success',
      description: riskyRows.length
        ? `${riskyRows.length} продажів потребують уваги: висока знижка або маржа нижче робочої бази ${percent(marginThreshold)}.`
        : 'Середня знижка тримається без явного тиску на маржу в поточному зрізі.'
    }
  ];

  function handleFilterChange(columnId: string, values: string[]) {
    setFilters((current) => ({ ...current, [columnId]: values }));
  }

  if (!month) {
    return (
      <div className="border border-line bg-[var(--panel)] p-6 text-sm text-muted">
        Немає оброблених Excel-даних для побудови продажного dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardFilterBar
        month={month}
        months={months}
        onMonthChange={setMonth}
        onQueryChange={setQuery}
        onSearchModeChange={setSearchMode}
        query={query}
        searchMode={searchMode}
        suggestionGridClassName={searchMode === 'group' || searchMode === 'brand' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2'}
        suggestions={suggestions}
      />

      <section className="filter-bar motion-fade-up">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-muted">Швидкий фокус</div>
        <div className="flex flex-wrap gap-2">
          {quickFocusOptions.map((option) => (
            <button
              className={`filter-pill ${quickFocus === option.value ? 'filter-pill-active' : ''}`}
              key={option.value}
              onClick={() => setQuickFocus(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="metric-strip motion-fade-up">
        <div className="metric-strip-item">
          <div className="metric-strip-label">Факт проти темпу</div>
          <div className="metric-strip-value">{money(monthPace.varianceToTempo)}</div>
          <div className="metric-strip-copy">Очікування на поточну дату</div>
        </div>
        <div className="metric-strip-item">
          <div className="metric-strip-label">Частка PROFIT</div>
          <div className="metric-strip-value">{percent(profitShare)}</div>
          <div className="metric-strip-copy">Ціль: {percent(PROFIT_PLAN_PERCENT)}</div>
        </div>
        <div className="metric-strip-item">
          <div className="metric-strip-label">Ризикові продажі</div>
          <div className="metric-strip-value">{riskyRows.length}</div>
          <div className="metric-strip-copy">Рядки, де знижка або маржа вже потребують рев'ю</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard hint={`Видимий оборот за ${month}`} title="Оборот зрізу" tone="info" value={money(kpis.totalTurnover)} />
        <KpiCard hint={`Планова база: ${money(kpis.planTurnover)} з планом ${money(kpis.grossPlan)}`} title="Валовий план" tone={kpis.grossPlanCompletion >= 100 ? 'success' : kpis.grossPlanCompletion >= 85 ? 'warning' : 'danger'} value={percent(kpis.grossPlanCompletion)} />
        <KpiCard hint={`На поточну дату очікувалось ${money(monthPace.expectedTurnoverToDate)}`} title="Темп місяця" tone={monthPace.varianceToTempo >= 0 ? 'success' : 'warning'} value={money(monthPace.varianceToTempo)} />
        <KpiCard hint={`Якщо зберегти поточний ритм, місяць закриється на ${percent(monthPace.projectedCompletionPercent)}`} title="Темп %" tone={monthPace.projectedCompletionPercent >= 100 ? 'success' : monthPace.projectedCompletionPercent >= 85 ? 'warning' : 'danger'} value={percent(monthPace.projectedCompletionPercent)} />
        <KpiCard hint={`Ціль PROFIT: ${percent(PROFIT_PLAN_PERCENT)}`} title="Частка PROFIT" tone={profitGap > 0 ? 'warning' : 'success'} value={percent(profitShare)} />
        <KpiCard hint={`Робоча база знижки в цьому зрізі`} title="Середня знижка" tone={avgDiscount >= 8 ? 'warning' : 'secondary'} value={percent(avgDiscount)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DailySalesChart data={daily} title={`Щоденна динаміка продажів за ${month}`} />
        <SimpleBarChart data={topClientsChart} title="Топ клієнтів за оборотом" valueLabel="Оборот" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <SimpleBarChart data={topBrandsChart} title="Топ брендів" valueLabel="Оборот" />
        <SimpleBarChart data={topGroupsChart} title="Топ товарних груп" valueLabel="Оборот" />
        <SimpleBarChart data={plannedGroupBars} title="Планові групи за фактом" valueLabel="Оборот" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Робочі сигнали для росту</div>
          <div className="text-xs text-muted">Тут зібрані показники, які найбільше впливають на план, темп, допродаж, контроль знижок і оплат.</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {actionSignals.map((signal) => (
              <div className="insight-tile interactive-lift" key={signal.title}>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">{signal.title}</div>
                <div className={`mt-2 text-2xl font-black ${
                  signal.tone === 'danger'
                    ? 'text-[var(--danger)]'
                    : signal.tone === 'warning'
                      ? 'text-[var(--warning)]'
                      : signal.tone === 'success'
                        ? 'text-[var(--success)]'
                        : 'text-[var(--accent-2)]'
                }`}
                >
                  {signal.value}
                </div>
                <div className="mt-2 text-sm leading-6 text-muted">{signal.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Ритм місяця і фокус дій</div>
          <div className="text-xs text-muted">Блок показує, як ідемо відносно пройдених днів місяця і що потрібно закривати швидше за все.</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="soft-panel interactive-lift p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Пройдено місяця</div>
              <div className="mt-2 text-2xl font-black text-white">{percent(monthPace.elapsedShare * 100)}</div>
              <div className="mt-2 text-sm text-muted">{monthPace.elapsedDays} з {monthPace.totalDays} днів.</div>
            </div>
            <div className="soft-panel interactive-lift p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Потрібно в день</div>
              <div className="mt-2 text-2xl font-black text-white">{money(monthPace.requiredPerDay)}</div>
              <div className="mt-2 text-sm text-muted">Скільки треба добирати щодня, щоб закрити валовий план місяця.</div>
            </div>
            <div className="soft-panel interactive-lift p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Топ-3 клієнти</div>
              <div className="mt-2 text-2xl font-black text-white">{percent(concentrationShare)}</div>
              <div className="mt-2 text-sm text-muted">Частка обороту трьох найбільших клієнтів.</div>
            </div>
            <div className="soft-panel interactive-lift p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Середня маржа</div>
              <div className="mt-2 text-2xl font-black text-white">{percent(avgMargin)}</div>
              <div className="mt-2 text-sm text-muted">Робоча база прибутковості для цього продажного зрізу.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Клієнти для допродажу і розширення матриці</div>
          <div className="text-xs text-muted">Де клієнт вже купує, але не закрив усі потрібні групи. Це прямий резерв допродажу.</div>
          <div className="mt-4">
            <DataTable
              columns={opportunityColumns}
              data={deficitClients.slice(0, 12)}
              initialSorting={[{ id: 'missingPlanShare', desc: true }]}
              maxHeightClassName="max-h-[30rem]"
              renderExpandedRow={(row) => (
                <div className="grid gap-4 border border-line bg-[var(--panel)] p-4">
                  <div className="text-sm text-white">
                    <strong>{row.clientName}</strong> ({row.clientCode || row.unifiedClientCode || 'без коду'})
                  </div>
                  <div className="text-sm text-muted">
                    Покрита частка плану: <span className="font-semibold text-white">{percent(row.coveredPlanShare)}</span>.
                    {' '}
                    Втрачена частка: <span className="font-semibold text-white">{percent(row.missingPlanShare)}</span>.
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Вже купує</div>
                      <div className="flex flex-wrap gap-2">
                        {row.coveredGroupStats.map((item) => (
                          <span className="border border-line bg-[rgba(59,130,246,0.12)] px-3 py-2 text-xs text-white" key={`${row.clientName}-${item.name}`}>
                            {item.name}: {money(item.amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Що відкрити</div>
                      <div className="flex flex-wrap gap-2">
                        {row.missingGroupStats.map((item) => (
                          <span className="border border-line bg-[rgba(201,107,93,0.12)] px-3 py-2 text-xs text-white" key={`${row.clientName}-${item.name}`}>
                            {item.name}: {percent(item.planShare)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        </div>

        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Продажі, де маржа або знижка потребують уваги</div>
          <div className="text-xs text-muted">Короткий список для ручного рев'ю перед закриттям місяця.</div>
          <div className="mt-4">
            <DataTable
              columns={riskColumns}
              data={riskyRows}
              initialSorting={[{ id: 'discountPercent', desc: true }]}
              maxHeightClassName="max-h-[30rem]"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Відставання або випередження темпу по групах</div>
          <div className="text-xs text-muted">Темп показаний у відсотках, а окремою колонкою винесено `факт - темп` у грошах.</div>
          <div className="mt-4">
            <DataTable
              columns={groupTempoColumns}
              data={tempoRows}
              initialSorting={[{ id: 'tempoDelta', desc: false }]}
              maxHeightClassName="max-h-[30rem]"
            />
          </div>
        </div>

        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Покриття PROFIT по клієнтах</div>
          <div className="text-xs text-muted">Одразу видно, де PROFIT вже є, а де клієнт дає оборот, але бренд ще не заведений.</div>
          <div className="mt-4">
            <DataTable
              columns={profitClientColumns}
              data={profitClients}
              initialSorting={[{ id: 'hasProfit', desc: false }, { id: 'turnover', desc: true }]}
              maxHeightClassName="max-h-[30rem]"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Покриття PROFIT по групах</div>
          <div className="text-xs text-muted">Показує, в яких групах вже багато клієнтів з PROFIT, а де вищий потенціал дотягнути бренд через існуючий оборот.</div>
          <div className="mt-4">
            <DataTable
              columns={profitGroupColumns}
              data={profitGroups}
              initialSorting={[{ id: 'penetrationPercent', desc: true }]}
              maxHeightClassName="max-h-[30rem]"
            />
          </div>
        </div>

        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Список задач винесено окремо</div>
          <div className="text-sm leading-6 text-muted">
            Для зручності todo тепер живе в окремій вкладці зі списком, тегами, пріоритетами і швидкими задачами з аналітики.
          </div>
          <div className="mt-4 space-y-3">
            <div className="soft-panel interactive-lift p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Що всередині</div>
              <div className="mt-2 text-sm text-muted">Окремий список `до роботи / в процесі / готово`, локальне зберігання, фільтри по тегах і пріоритетах, автопідказки по допродажу, PROFIT і дебіторці.</div>
            </div>
            <Link className="inline-flex items-center justify-center border border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.14)] px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:border-[rgba(59,130,246,0.6)] hover:bg-[rgba(59,130,246,0.2)]" href="/todo">
              Відкрити todo-список
            </Link>
          </div>
        </div>
      </section>

      <section className="panel-card interactive-lift p-4">
        <div className="mb-1 text-sm font-semibold text-white">Усі продажі в активному зрізі</div>
        <div className="text-xs text-muted">Графіки, KPI і таблиця дивляться на один і той самий фільтрований набір даних: місяць, глобальний пошук і фільтри колонок більше не розходяться.</div>
        <div className="mt-4">
          <DataTable
            activeFilters={filters}
            columns={salesColumns}
            data={visibleSales}
            initialSorting={[{ id: 'clientCode', desc: false }, { id: 'date', desc: false }]}
            maxHeightClassName="max-h-[42rem]"
            onFilterChange={handleFilterChange}
          />
        </div>
      </section>
    </div>
  );
}
