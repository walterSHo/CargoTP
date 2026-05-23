'use client';

import { useEffect, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DailySalesChart, SimpleBarChart } from '@/components/Charts';
import { DataTable } from '@/components/DataTable';
import { InfoHint } from '@/components/InfoHint';
import { KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';
import { AGGREGATE_PLAN_GROUP, PROFIT_GROUP_NAME } from '@/lib/constants';
import { availableMonths, avg, clientGroupShareGaps, dailySalesSeries, dashboardKpis, groupPlanAudit, salesForMonth, topClientsByTurnover, byTop, type ClientGroupGapRow, type TopClientRow } from '@/lib/analytics';
import { money, percent } from '@/lib/format';
import type { ProcessedData, ReceivableRecord, SalesRecord } from '@/lib/types';

type SearchMode = 'code' | 'client' | 'brand' | 'group';

const searchModes: Array<{ value: SearchMode; label: string }> = [
  { value: 'code', label: 'Код' },
  { value: 'client', label: 'Клієнт' },
  { value: 'brand', label: 'Бренд' },
  { value: 'group', label: 'Група' }
];

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

function matchesSales(row: SalesRecord, mode: SearchMode, query: string) {
  if (!query) return true;
  const value = query.toLowerCase();
  if (mode === 'code') return `${row.clientCode} ${row.unifiedClientCode}`.toLowerCase().includes(value);
  if (mode === 'client') return row.clientName.toLowerCase().includes(value);
  if (mode === 'brand') return row.brand.toLowerCase().includes(value);
  if (PROFIT_GROUP_NAME.toLowerCase().includes(value) && row.brand.toLowerCase() === PROFIT_GROUP_NAME.toLowerCase()) return true;
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
      if (row.brand.toLowerCase() === PROFIT_GROUP_NAME.toLowerCase()) values.add(PROFIT_GROUP_NAME);
    });
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' }));
}

export function OverviewClient({ data }: { data: ProcessedData }) {
  const months = availableMonths(data.sales).sort().reverse();
  const [month, setMonth] = useState(months[0] ?? '');
  const [searchMode, setSearchMode] = useState<SearchMode>('code');
  const [query, setQuery] = useState('');
  const [groupGapMode, setGroupGapMode] = useState<GroupGapMode>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (searchRef.current?.contains(event.target as Node)) return;
      setSearchOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

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
    .slice(0, 10);
  const activeClients = new Set(monthSales.map((row) => row.clientCode || row.unifiedClientCode || row.clientName)).size;
  const avgDailyTurnover = daily.length ? avg(daily.map((row) => row.turnover)) : 0;
  const topOverdueClients = byTop(receivables.filter((row) => row.overdueDebt > 0), (row) => row.clientName, (row) => row.overdueDebt, 8);
  const share31Plus = receivables.length
    ? (receivables.reduce((total, row) => total + row.bucket31Plus, 0) / Math.max(receivables.reduce((total, row) => total + row.totalDebt, 0), 1)) * 100
    : 0;
  const suggestions = suggestionValues(data, searchMode);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSuggestions = normalizedQuery
    ? suggestions.filter((item) => item.toLowerCase().includes(normalizedQuery))
    : suggestions;
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
        title="Огляд дашборду"
      />

      <section className="filter-bar">
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
                  <div className={`search-suggestion-grid ${suggestionGridClassName}`}>
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

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard hint={`Валовий оборот за ${month}`} title="Загальний оборот" tone="info" value={money(kpis.totalTurnover)} />
        <KpiCard hint={`Планова база: ${money(kpis.planTurnover)} з планом ${money(kpis.grossPlan)}`} title="Виконання валового плану" tone={completionTone} value={percent(kpis.grossPlanCompletion)} />
        <KpiCard hint={`31+ днів: ${percent(share31Plus)} від усієї дебіторки`} title="Прострочена дебіторка" tone={debtTone} value={money(kpis.overdueDebt)} />
        <KpiCard hint={`Середній день: ${money(avgDailyTurnover)}`} title="Активні клієнти" tone="teal" value={String(activeClients)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DailySalesChart data={daily} title={`Щоденна динаміка за ${month}`} />
        <SimpleBarChart data={topClientsChart} title="Топ клієнтів за оборотом" valueLabel="Оборот" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[18px] border border-line bg-[rgba(10,18,33,0.94)] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.2)]">
          <div className="mb-1 text-sm font-semibold text-[var(--ink)]">Планові долі груп</div>
          <div className="text-xs text-muted">Показуємо реальну долю від обороту та ціль по кожній групі, включно з окремою групою PROFIT.</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {groupShareTargets.map((row) => (
              <div className="rounded-[16px] border border-line bg-[rgba(8,15,28,0.74)] px-3 py-3" key={row.name}>
                <div className="truncate text-[13px] font-semibold text-white" title={row.name}>{row.name}</div>
                <div className="mt-1 text-[11px] leading-4 text-muted">
                  {money(row.turnover)} · {percent(row.turnoverShare)} · {percent(row.targetShare)}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(141,162,199,0.16)]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#4ea1ff,#2dd4bf)]" style={{ width: `${Math.min(row.completionPercent, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <SimpleBarChart barColor="#fb7185" data={topOverdueClients} title="Топ клієнтів за прострочкою" valueLabel="Прострочка" />
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
                    <div className="rounded-[12px] border border-line bg-[rgba(8,15,28,0.72)] px-3 py-2" key={item.name}>
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
                    <div className="rounded-[12px] border border-line bg-[rgba(78,161,255,0.08)] px-3 py-2" key={item.name}>
                      <div className="text-sm font-semibold text-white">{item.name}</div>
                      <div className="mt-1 text-[10px] leading-4 text-muted">{percent(item.planShare)}</div>
                    </div>
                  )) : (
                    <div className="rounded-[12px] border border-line bg-[rgba(52,211,153,0.08)] px-3 py-2 text-sm text-white">Усі планові групи вже закриті</div>
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
