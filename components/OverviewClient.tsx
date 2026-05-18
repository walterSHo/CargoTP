'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DailySalesChart, SimpleBarChart, SimplePieChart } from '@/components/Charts';
import { DataTable } from '@/components/DataTable';
import { InfoHint } from '@/components/InfoHint';
import { KpiCard } from '@/components/KpiCard';
import { availableMonths, avg, clientGroupShareGaps, dailySalesSeries, dashboardKpis, groupPlanAudit, salesForMonth, topClientsByTurnover, byTop, type ClientGroupGapRow, type TopClientRow } from '@/lib/analytics';
import { EXCLUDED_GROSS_PLAN_GROUP } from '@/lib/constants';
import { money, percent } from '@/lib/format';
import type { ProcessedData, ReceivableRecord, SalesRecord } from '@/lib/types';

type SearchMode = 'code' | 'client' | 'brand' | 'group';

const searchModes: Array<{ value: SearchMode; label: string }> = [
  { value: 'code', label: 'Код' },
  { value: 'client', label: 'Клієнт' },
  { value: 'brand', label: 'Бренд' },
  { value: 'group', label: 'Група' }
];

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
        return <span title={value}>{preview || 'Все закрито'}</span>;
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
  return row.productGroup.toLowerCase().includes(value);
}

function matchesReceivables(row: ReceivableRecord, mode: SearchMode, query: string) {
  if (!query) return true;
  const value = query.toLowerCase();
  if (mode === 'code') return `${row.clientCode} ${row.unifiedClientCode}`.toLowerCase().includes(value);
  if (mode === 'client') return row.clientName.toLowerCase().includes(value);
  return true;
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
  if (mode === 'group') data.sales.forEach((row) => row.productGroup && values.add(row.productGroup));
  return [...values].sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' })).slice(0, 200);
}

export function OverviewClient({ data }: { data: ProcessedData }) {
  const months = availableMonths(data.sales).sort().reverse();
  const [month, setMonth] = useState(months[0] ?? '');
  const [searchMode, setSearchMode] = useState<SearchMode>('code');
  const [query, setQuery] = useState('');

  if (!month) {
    return (
      <div className="page-hero">
        <div className="eyebrow">No data</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Огляд дашборду</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Немає оброблених Excel-даних для побудови аналітики.</p>
      </div>
    );
  }

  const monthSales = salesForMonth(data.sales, month).filter((row) => matchesSales(row, searchMode, query));
  const receivables = data.receivables.filter((row) => matchesReceivables(row, searchMode, query));
  const kpis = dashboardKpis(monthSales, receivables, data.monthlyPlans, month);
  const topClients = topClientsByTurnover(monthSales, 12);
  const topClientsChart = topClients.slice(0, 8).map((row) => ({ name: row.clientName, value: row.turnover }));
  const groupMix = byTop(monthSales, (row) => row.productGroup, (row) => row.amountEur, 8);
  const daily = dailySalesSeries(monthSales);
  const groupGaps = clientGroupShareGaps(data.groupPlans, monthSales);
  const groupShareTargets = groupPlanAudit(data.groupPlans, monthSales)
    .sort((a, b) => b.shareOfGrossPlan - a.shareOfGrossPlan)
    .map((row) => ({ name: row.productGroup, value: row.shareOfGrossPlan }))
    .slice(0, 10);
  const activeClients = new Set(monthSales.map((row) => row.clientCode || row.unifiedClientCode || row.clientName)).size;
  const avgDailyTurnover = daily.length ? avg(daily.map((row) => row.turnover)) : 0;
  const topClientShare = topClients[0]?.sharePercent ?? 0;
  const topPlannedGroup = groupShareTargets[0];
  const suggestions = suggestionValues(data, searchMode);

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="eyebrow">Dark operations mode</div>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">Огляд дашборду</h1>
            <p className="mt-4 text-sm leading-6 text-muted md:text-base">
              Більш контрастний робочий екран для щоденного контролю обороту, планових долей груп, дебіторки та ризикових клієнтів.
            </p>
          </div>
          <div className="soft-panel p-4 md:min-w-[260px]">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Стан даних</div>
            <div className="mt-2 text-sm text-white">Оновлено: {data.updatedAt ? new Date(data.updatedAt).toLocaleString('uk-UA') : 'немає мітки часу'}</div>
            <div className="mt-2 text-sm text-muted">Активний місяць: <span className="font-semibold text-white">{month}</span></div>
          </div>
        </div>
      </section>

      <section className="filter-bar">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_auto]">
          <label className="grid gap-2">
            <span className="filter-label">Місяць</span>
            <select className="filter-select" onChange={(event) => setMonth(event.target.value)} value={month}>
              {months.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="filter-label">Пошук</span>
            <input
              className="filter-input"
              list="overview-search-suggestions"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Фільтр за полем: ${searchModes.find((item) => item.value === searchMode)?.label.toLowerCase()}`}
              value={query}
            />
            <datalist id="overview-search-suggestions">
              {suggestions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
          <div className="grid gap-2">
            <span className="filter-label">Режим</span>
            <div className="flex flex-wrap gap-2">
              {searchModes.map((item) => (
                <button
                  className={`filter-pill ${searchMode === item.value ? 'filter-pill-active' : ''}`}
                  key={item.value}
                  onClick={() => setSearchMode(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="insight-tile">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Активні клієнти</div>
          <div className="mt-2 text-3xl font-black text-white">{activeClients}</div>
          <div className="mt-2 text-sm text-muted">Кількість клієнтів у вибірці після фільтрації.</div>
        </div>
        <div className="insight-tile">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Середній день</div>
          <div className="mt-2 text-3xl font-black text-white">{money(avgDailyTurnover)}</div>
          <div className="mt-2 text-sm text-muted">Середній денний оборот за активні дні місяця.</div>
        </div>
        <div className="insight-tile">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Концентрація</div>
          <div className="mt-2 text-3xl font-black text-white">{percent(topClientShare)}</div>
          <div className="mt-2 text-sm text-muted">Частка найбільшого клієнта у місячному обороті.</div>
        </div>
        <div className="insight-tile">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">Ключова група</div>
          <div className="mt-2 text-xl font-black text-white">{topPlannedGroup?.name ?? '—'}</div>
          <div className="mt-2 text-sm text-muted">{topPlannedGroup ? `Цільова доля: ${percent(topPlannedGroup.value)}` : 'Немає планових долей груп.'}</div>
        </div>
      </section>

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
          <h2 className="section-title text-white">Цільові долі груп у валовому плані</h2>
          <p className="section-copy text-sm">Це плановий відсоток від обороту, який мають дати групи у валовому плані.</p>
        </div>
        <SimpleBarChart data={groupShareTargets} title="Планові долі груп" valueFormatter={percent} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="section-title text-white">Клієнти, які не закривають планові групи</h2>
          <p className="section-copy text-sm">У таблиці показані всі клієнти поточного місяця. Натисніть на рядок, щоб побачити, які групи клієнт вже робить і яких саме не вистачає до повного покриття плану.</p>
        </div>
        <DataTable
          columns={gapColumns()}
          data={groupGaps}
          initialSorting={[{ id: 'missingPlanShare', desc: true }, { id: 'turnover', desc: true }]}
          renderExpandedRow={(row) => (
            <div className="soft-panel space-y-3 p-4">
              <div className="text-sm font-semibold text-white">{row.clientName} ({row.clientCode || row.unifiedClientCode || 'без коду'})</div>
              <div className="text-sm text-muted">
                Покрита частка плану: <strong className="text-white">{percent(row.coveredPlanShare)}</strong>. Втрачена частка: <strong className="text-white">{percent(row.missingPlanShare)}</strong>.
              </div>
              <div className="text-sm text-muted">
                Групи, які клієнт вже робить: <span className="text-white">{row.coveredGroupNames.join(', ') || 'поки немає планових груп'}</span>
              </div>
              <div className="text-sm text-muted">
                Повний список відсутніх груп: <span className="text-white">{row.missingGroupNames.join(', ') || 'усі планові групи вже закриті'}</span>
              </div>
            </div>
          )}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="section-title text-white">Топ клієнтів місяця</h2>
          <p className="section-copy text-sm">Тут видно не тільки оборот, а й частку місяця та ширину роботи по групах.</p>
        </div>
        <DataTable columns={topClientColumns()} data={topClients} initialSorting={[{ id: 'turnover', desc: true }]} maxHeightClassName="max-h-[30rem]" />
      </section>
    </div>
  );
}
