'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DailySalesChart, SimpleBarChart, SimplePieChart } from './Charts';
import { DataTable } from './DataTable';
import { KpiCard } from './KpiCard';
import { AGGREGATE_PLAN_GROUP, PROFIT_GROUP_NAME, PROFIT_PLAN_PERCENT } from '@/lib/constants';
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
import type { ProcessedData, ReceivableRecord, SalesRecord } from '@/lib/types';

type SearchMode = 'code' | 'client' | 'brand' | 'group';

type ActionSignal = {
  title: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'teal';
  description: string;
};

const searchModes: Array<{ value: SearchMode; label: string }> = [
  { value: 'code', label: 'Код' },
  { value: 'client', label: 'Клієнт' },
  { value: 'brand', label: 'Бренд' },
  { value: 'group', label: 'Група' }
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
  { accessorKey: 'penetrationPercent', header: 'Penetration %', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'potentialTurnover', header: 'Потенціал без PROFIT', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'turnover', header: 'Оборот групи', cell: (info) => money(Number(info.getValue())) }
];

function matchesSales(row: SalesRecord, mode: SearchMode, query: string) {
  if (!query) return true;
  const value = query.toLowerCase();
  if (mode === 'code') return `${row.clientCode} ${row.unifiedClientCode}`.toLowerCase().includes(value);
  if (mode === 'client') return row.clientName.toLowerCase().includes(value);
  if (mode === 'brand') return row.brand.toLowerCase().includes(value);
  if (normalizeProductGroup(PROFIT_GROUP_NAME).includes(normalizeProductGroup(value)) && normalizeProductGroup(row.brand) === normalizeProductGroup(PROFIT_GROUP_NAME)) return true;
  return row.productGroup.toLowerCase().includes(value);
}

function matchesReceivables(row: ReceivableRecord, mode: SearchMode, query: string) {
  if (!query) return true;
  const value = query.toLowerCase();
  if (mode === 'code') return `${row.clientCode} ${row.unifiedClientCode}`.toLowerCase().includes(value);
  if (mode === 'client') return row.clientName.toLowerCase().includes(value);
  return false;
}

function suggestionValues(data: ProcessedData, mode: SearchMode) {
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
      if (normalizeProductGroup(row.brand) === normalizeProductGroup(PROFIT_GROUP_NAME)) values.add(PROFIT_GROUP_NAME);
    });
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' }));
}

function applyColumnFilters(rows: SalesRecord[], filters: Record<string, string[]>) {
  const keys = salesColumns
    .map((column) => typeof column.accessorKey === 'string' ? column.accessorKey : '')
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
  const [searchMode, setSearchMode] = useState<SearchMode>('code');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (searchRef.current?.contains(event.target as Node)) return;
      setSearchOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const suggestions = useMemo(() => suggestionValues(data, searchMode), [data, searchMode]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSuggestions = normalizedQuery
    ? suggestions.filter((item) => item.toLowerCase().includes(normalizedQuery))
    : suggestions;
  const baseSales = useMemo(
    () => salesForMonth(data.sales, month).filter((row) => matchesSales(row, searchMode, query)),
    [data.sales, month, query, searchMode]
  );
  const visibleSales = useMemo(() => applyColumnFilters(baseSales, filters), [baseSales, filters]);
  const visibleClientKeys = useMemo(
    () => new Set(visibleSales.map((row) => row.clientCode || row.unifiedClientCode || row.clientName)),
    [visibleSales]
  );
  const receivables = useMemo(() => data.receivables.filter((row) => {
    if (searchMode === 'brand' || searchMode === 'group') {
      return !query || visibleClientKeys.has(row.clientCode || row.unifiedClientCode || row.clientName);
    }

    if (visibleClientKeys.size > 0 && (Object.keys(filters).length > 0 || query || month)) {
      return visibleClientKeys.has(row.clientCode || row.unifiedClientCode || row.clientName) && matchesReceivables(row, searchMode, query);
    }

    return matchesReceivables(row, searchMode, query);
  }), [data.receivables, filters, month, query, searchMode, visibleClientKeys]);

  const kpis = useMemo(() => dashboardKpis(visibleSales, receivables, data.monthlyPlans, month), [data.monthlyPlans, month, receivables, visibleSales]);
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
  const topGroupsPie = useMemo(() => groupShareTargets.map((row) => ({ name: row.name, value: row.turnover })).filter((row) => row.value > 0), [groupShareTargets]);
  const topOverdueClients = useMemo(() => byTop(receivables.filter((row) => row.overdueDebt > 0), (row) => row.clientName, (row) => row.overdueDebt, 8), [receivables]);
  const tempoRows = useMemo(() => groupTempoRows(data.groupPlans, visibleSales, month), [data.groupPlans, month, visibleSales]);
  const profitClients = useMemo(() => profitClientPenetration(visibleSales, 12), [visibleSales]);
  const profitGroups = useMemo(() => profitGroupPenetration(visibleSales, 10), [visibleSales]);

  const totalDebt = receivables.reduce((sum, row) => sum + row.totalDebt, 0);
  const share31Plus = receivables.length
    ? (receivables.reduce((sum, row) => sum + row.bucket31Plus, 0) / Math.max(totalDebt, 1)) * 100
    : 0;
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
        ? `Бракує ${percent(profitGap)} до цілі PROFIT. Найкраще тиснути через клієнтів і групи з низьким penetration.`
        : 'Ціль PROFIT виконана. Можна утримувати частку та переносити фокус на інші резерви.'
    },
    {
      title: 'Cross-sell резерв',
      value: `${deficitClients.length} клієнтів`,
      tone: deficitClients.length ? 'teal' : 'success',
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
      title: 'Знижка тисне на маржу',
      value: money(discountPressureTurnover),
      tone: riskyRows.length ? 'danger' : 'success',
      description: riskyRows.length
        ? `${riskyRows.length} продажів потребують уваги: висока знижка або маржа нижче робочої бази ${percent(marginThreshold)}.`
        : 'Немає рядків, де знижка або маржа зараз виглядають ризиково для цього зрізу.'
    }
  ];

  function handleFilterChange(columnId: string, values: string[]) {
    setFilters((current) => ({ ...current, [columnId]: values }));
  }

  if (!month) {
    return (
      <div className="rounded-[18px] border border-line bg-[rgba(10,18,33,0.94)] p-6 text-sm text-muted">
        Немає оброблених Excel-даних для побудови продажного dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="filter-bar motion-fade-up">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_auto]">
          <label className="grid gap-2">
            <span className="filter-label">Місяць</span>
            <select className="filter-select" onChange={(event) => setMonth(event.target.value)} value={month}>
              {months.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className={`search-shell grid gap-2 ${searchOpen ? 'search-shell-open' : ''}`} ref={searchRef}>
            <span className="filter-label">Пошук</span>
            <div className="relative">
              <input
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                className="filter-input"
                inputMode="search"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder={`Фільтр за полем: ${searchModes.find((item) => item.value === searchMode)?.label.toLowerCase()}`}
                spellCheck={false}
                value={query}
              />
              {searchOpen && visibleSuggestions.length ? (
                <div className="search-suggestion-popover">
                  <div className={`search-suggestion-grid ${searchMode === 'group' || searchMode === 'brand' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2'}`}>
                    {visibleSuggestions.map((item) => (
                      <button
                        className="search-suggestion-option"
                        key={item}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setQuery(item);
                          setSearchOpen(false);
                        }}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="filter-label">Режим</span>
            <div className="flex flex-wrap gap-2">
              {searchModes.map((item) => (
                <button
                  className={`filter-pill ${searchMode === item.value ? 'filter-pill-active' : ''}`}
                  key={item.value}
                  onClick={() => {
                    setSearchMode(item.value);
                    setSearchOpen(true);
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard hint={`Видимий оборот за ${month}`} title="Оборот зрізу" tone="info" value={money(kpis.totalTurnover)} />
        <KpiCard hint={`Планова база: ${money(kpis.planTurnover)} з планом ${money(kpis.grossPlan)}`} title="Валовий план" tone={kpis.grossPlanCompletion >= 100 ? 'success' : kpis.grossPlanCompletion >= 85 ? 'warning' : 'danger'} value={percent(kpis.grossPlanCompletion)} />
        <KpiCard hint={`На поточну дату очікувалось ${money(monthPace.expectedTurnoverToDate)}`} title="Темп місяця" tone={monthPace.varianceToTempo >= 0 ? 'success' : 'warning'} value={money(monthPace.varianceToTempo)} />
        <KpiCard hint={`Ціль PROFIT: ${percent(PROFIT_PLAN_PERCENT)}`} title="Частка PROFIT" tone={profitGap > 0 ? 'warning' : 'success'} value={percent(profitShare)} />
        <KpiCard hint={`Робоча база маржі в цьому зрізі`} title="Середня маржа" tone="teal" value={percent(avgMargin)} />
        <KpiCard hint={`31+ днів: ${percent(share31Plus)} від дебіторки видимих клієнтів`} title="Прострочена дебіторка" tone={kpis.overdueDebt > 0 ? 'danger' : 'success'} value={money(kpis.overdueDebt)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DailySalesChart data={daily} title={`Щоденна динаміка продажів за ${month}`} />
        <SimpleBarChart data={topClientsChart} title="Топ клієнтів за оборотом" valueLabel="Оборот" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <SimpleBarChart data={topBrandsChart} title="Топ брендів" valueLabel="Оборот" />
        <SimpleBarChart data={topGroupsChart} title="Топ товарних груп" valueLabel="Оборот" />
        <SimplePieChart data={topGroupsPie} title="Структура груп" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Робочі сигнали для росту</div>
          <div className="text-xs text-muted">Тут зібрані показники, які найбільше впливають на план, темп, cross-sell, контроль знижок і оплат.</div>
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
          <div className="text-xs text-muted">Блок показує, як ідемо относительно пройденных дней месяца и что нужно закрывать быстрее всего.</div>
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
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Видима дебіторка</div>
              <div className="mt-2 text-2xl font-black text-white">{money(totalDebt)}</div>
              <div className="mt-2 text-sm text-muted">Щоб продажі не відривались від оплат.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="panel-card interactive-lift p-4">
          <div className="mb-1 text-sm font-semibold text-white">Клієнти для допродажу і розширення матриці</div>
          <div className="text-xs text-muted">Де клієнт вже купує, але не закрив усі потрібні групи. Це прямий cross-sell резерв.</div>
          <div className="mt-4">
            <DataTable
              columns={opportunityColumns}
              data={deficitClients.slice(0, 12)}
              initialSorting={[{ id: 'missingPlanShare', desc: true }]}
              maxHeightClassName="max-h-[30rem]"
              renderExpandedRow={(row) => (
                <div className="grid gap-4 rounded-[14px] border border-line bg-[rgba(15,25,45,0.92)] p-4">
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
                          <span className="rounded-[10px] border border-line bg-[rgba(78,161,255,0.12)] px-3 py-2 text-xs text-white" key={`${row.clientName}-${item.name}`}>
                            {item.name}: {money(item.amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Що відкрити</div>
                      <div className="flex flex-wrap gap-2">
                        {row.missingGroupStats.map((item) => (
                          <span className="rounded-[10px] border border-line bg-[rgba(251,113,133,0.12)] px-3 py-2 text-xs text-white" key={`${row.clientName}-${item.name}`}>
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
          <div className="mb-1 text-sm font-semibold text-white">Отставание или опережение темпа по группам</div>
          <div className="text-xs text-muted">Темп показан в процентах, а отдельной колонкой вынесено `факт - темп` в деньгах.</div>
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
          <div className="mb-1 text-sm font-semibold text-white">PROFIT penetration по клиентам</div>
          <div className="text-xs text-muted">Сразу видно, где PROFIT уже есть, а где клиент даёт оборот, но бренд ещё не заведен.</div>
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
          <div className="mb-1 text-sm font-semibold text-white">PROFIT penetration по группам</div>
          <div className="text-xs text-muted">Показывает, в каких группах уже много клиентов с PROFIT, а где выше потенциал дотянуть бренд через существующий оборот.</div>
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
          <div className="mb-1 text-sm font-semibold text-white">Todo-дошка вынесена отдельно</div>
          <div className="text-sm leading-6 text-muted">
            Для удобства todo теперь живёт в отдельной вкладке с доской, тегами, приоритетами и быстрыми задачами из аналитики.
          </div>
          <div className="mt-4 space-y-3">
            <div className="soft-panel interactive-lift p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Что там есть</div>
              <div className="mt-2 text-sm text-muted">Отдельная доска `todo / doing / done`, локальное хранение, фильтры по тегам и приоритетам, автоподсказки по cross-sell, PROFIT и дебиторке.</div>
            </div>
            <Link className="inline-flex items-center justify-center rounded-[12px] border border-[rgba(78,161,255,0.42)] bg-[rgba(78,161,255,0.16)] px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-[1px] hover:border-[rgba(78,161,255,0.6)] hover:bg-[rgba(78,161,255,0.22)]" href="/todo">
              Открыть todo-доску
            </Link>
          </div>
        </div>
      </section>

      <section className="panel-card interactive-lift p-4">
        <div className="mb-1 text-sm font-semibold text-white">Усі продажі в активному зрізі</div>
        <div className="text-xs text-muted">Графіки, KPI і таблиця дивляться на один і той самий filtered dataset: місяць, глобальний пошук і column filters більше не розходяться.</div>
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
