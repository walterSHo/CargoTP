'use client';

import { DataTable } from './DataTable';
import { SimpleBarChart } from './Charts';
import { byTop } from '@/lib/analytics';
import { money } from '@/lib/format';
import type { ReceivableRecord } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<ReceivableRecord>[] = [
  { accessorKey: 'unifiedClientCode', header: 'Единый код' },
  { accessorKey: 'clientCode', header: 'Код клиента' },
  { accessorKey: 'clientName', header: 'Клиент' },
  { accessorKey: 'totalDebt', header: 'Всего', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'currentDebt', header: 'Непросроченная', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'overdueDebt', header: 'Просроченная', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'bucket0To10', header: '0–10', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'bucket11To20', header: '11–20', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'bucket21To30', header: '21–30', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'bucket31Plus', header: '31+', cell: (info) => money(Number(info.getValue())) }
];

export function ReceivablesClient({ receivables }: { receivables: ReceivableRecord[] }) {
  return (
    <>
      <SimpleBarChart data={byTop(receivables, (row) => row.clientName, (row) => row.totalDebt, 8)} />
      <DataTable columns={columns} data={[...receivables].sort((a, b) => b.totalDebt - a.totalDebt)} />
    </>
  );
}
