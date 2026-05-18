'use client';

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
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <SimpleBarChart data={byTop(sales, (row) => row.clientName, (row) => row.amountEur, 5)} title="Топ клієнтів за оборотом" />
        <SimpleBarChart data={byTop(sales, (row) => row.brand, (row) => row.amountEur, 5)} title="Топ брендів" />
        <SimpleBarChart data={byTop(sales, (row) => row.productGroup, (row) => row.amountEur, 5)} title="Топ товарних груп" />
      </div>
      <DataTable columns={columns} data={sales} initialSorting={[{ id: 'clientCode', desc: false }, { id: 'date', desc: false }]} />
    </>
  );
}
