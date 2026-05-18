'use client';

import { useMemo, useState } from 'react';
import { DataTable } from './DataTable';
import { SimpleBarChart } from './Charts';
import { byTop } from '@/lib/analytics';
import { money, percent } from '@/lib/format';
import type { SalesRecord } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<SalesRecord>[] = [
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

const filterableColumns = ['date', 'unifiedClientCode', 'clientCode', 'clientName', 'brand', 'productGroup'] as const;
const filterLabels: Record<(typeof filterableColumns)[number], string> = {
  date: 'Дата',
  unifiedClientCode: 'Єдиний код',
  clientCode: 'Код клієнта',
  clientName: 'Клієнт',
  brand: 'Бренд',
  productGroup: 'Група'
};

export function SalesClient({ sales }: { sales: SalesRecord[] }) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const filterOptions = useMemo(() => Object.fromEntries(
    filterableColumns.map((columnId) => [
      columnId,
      [...new Set(sales.map((row) => String(row[columnId] ?? '')).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' }))
    ])
  ), [sales]);

  const filteredSales = useMemo(() => sales.filter((row) => filterableColumns.every((columnId) => {
    const selected = filters[columnId];
    if (!selected?.length) return true;
    return selected.includes(String(row[columnId] ?? ''));
  })), [filters, sales]);

  const activeFilterChips = useMemo(() => Object.entries(filters).flatMap(([columnId, values]) => values.map((value) => ({ columnId, value }))), [filters]);

  return (
    <div className="space-y-4">
      <section className="filter-bar space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="filter-label">Фільтри таблиці продажів</div>
            <p className="mt-1 text-sm text-muted">Натисніть `Фільтр` у заголовку колонки, щоб швидко відібрати потрібні дати, клієнтів, бренди або групи.</p>
          </div>
          <div className="rounded-2xl border border-line bg-[rgba(8,15,28,0.72)] px-4 py-3 text-sm text-white">
            Показано рядків: <strong>{filteredSales.length}</strong> з {sales.length}
          </div>
        </div>
        {activeFilterChips.length ? (
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.map(({ columnId, value }) => (
              <button
                className="filter-pill filter-pill-active"
                key={`${columnId}:${value}`}
                onClick={() => setFilters((current) => ({ ...current, [columnId]: (current[columnId] ?? []).filter((item) => item !== value) }))}
                type="button"
              >
                {filterLabels[columnId as keyof typeof filterLabels]}: {value}
              </button>
            ))}
            <button className="filter-pill" onClick={() => setFilters({})} type="button">Очистити все</button>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <SimpleBarChart data={byTop(filteredSales, (row) => row.clientName, (row) => row.amountEur, 5)} title="Топ клієнтів за оборотом" />
        <SimpleBarChart data={byTop(filteredSales, (row) => row.brand || 'Без бренду', (row) => row.amountEur, 5)} title="Топ брендів" />
        <SimpleBarChart data={byTop(filteredSales, (row) => row.productGroup, (row) => row.amountEur, 5)} title="Топ товарних груп" />
      </div>
      <DataTable
        activeFilters={filters}
        columns={columns}
        data={filteredSales}
        filterOptions={filterOptions}
        initialSorting={[{ id: 'clientCode', desc: false }, { id: 'date', desc: false }]}
        maxHeightClassName="max-h-[42rem]"
        onFilterChange={(columnId, values) => setFilters((current) => ({ ...current, [columnId]: values }))}
      />
    </div>
  );
}
