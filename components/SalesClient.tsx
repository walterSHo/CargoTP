'use client';

import { DataTable } from './DataTable';
import { SimpleBarChart } from './Charts';
import { byTop } from '@/lib/analytics';
import { money, percent } from '@/lib/format';
import type { SalesRecord } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<SalesRecord>[] = [
  { accessorKey: 'date', header: 'Дата' },
  { accessorKey: 'unifiedClientCode', header: 'Единый код' },
  { accessorKey: 'clientCode', header: 'Код клиента' },
  { accessorKey: 'clientName', header: 'Клиент' },
  { accessorKey: 'brand', header: 'Бренд' },
  { accessorKey: 'productGroup', header: 'Группа' },
  { accessorKey: 'productCode', header: 'Товар' },
  { accessorKey: 'amountEur', header: 'Сумма', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'netMargin', header: 'Net margin', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'discountPercent', header: 'Скидка', cell: (info) => percent(Number(info.getValue())) }
];

export function SalesClient({ sales }: { sales: SalesRecord[] }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <SimpleBarChart data={byTop(sales, (row) => row.clientName, (row) => row.amountEur, 5)} />
        <SimpleBarChart data={byTop(sales, (row) => row.brand, (row) => row.amountEur, 5)} />
        <SimpleBarChart data={byTop(sales, (row) => row.productGroup, (row) => row.amountEur, 5)} />
      </div>
      <DataTable columns={columns} data={sales} />
    </>
  );
}
