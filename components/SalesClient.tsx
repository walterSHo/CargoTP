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

export function SalesClient({ sales }: { sales: SalesRecord[] }) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const filterableColumns = useMemo(
    () => columns.map((column) => typeof column.accessorKey === 'string' ? column.accessorKey : '').filter(Boolean),
    []
  );

  const filterOptions = useMemo(() => Object.fromEntries(
    filterableColumns.map((columnId) => [
      columnId,
      [...new Set(sales.map((row) => String(row[columnId] ?? '')).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' }))
    ])
  ), [filterableColumns, sales]);

  const filteredSales = useMemo(() => sales.filter((row) => filterableColumns.every((columnId) => {
    const selected = filters[columnId];
    if (!selected?.length) return true;
    return selected.includes(String(row[columnId] ?? ''));
  })), [filterableColumns, filters, sales]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <SimpleBarChart data={byTop(filteredSales, (row) => row.clientName, (row) => row.amountEur, 5)} title="Топ клієнтів за оборотом" valueLabel="Оборот" />
        <SimpleBarChart data={byTop(filteredSales, (row) => row.brand || 'Без бренду', (row) => row.amountEur, 5)} title="Топ брендів" valueLabel="Оборот" />
        <SimpleBarChart data={byTop(filteredSales, (row) => row.productGroup, (row) => row.amountEur, 5)} title="Топ товарних груп" valueLabel="Оборот" />
      </div>
      <DataTable
        activeFilters={filters}
        columns={columns}
        data={sales}
        filterOptions={filterOptions}
        initialSorting={[{ id: 'clientCode', desc: false }, { id: 'date', desc: false }]}
        maxHeightClassName="max-h-[42rem]"
        onFilterChange={(columnId, values) => setFilters((current) => ({ ...current, [columnId]: values }))}
      />
    </div>
  );
}
