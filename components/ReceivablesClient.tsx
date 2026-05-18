'use client';

import { DataTable } from './DataTable';
import { SimpleBarChart } from './Charts';
import { byTop } from '@/lib/analytics';
import { money } from '@/lib/format';
import type { ReceivableRecord } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<ReceivableRecord>[] = [
  { accessorKey: 'unifiedClientCode', header: 'Єдиний код' },
  { accessorKey: 'clientCode', header: 'Код клієнта' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'totalDebt', header: 'Усього', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'currentDebt', header: 'Непрострочена', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'overdueDebt', header: 'Прострочена', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'bucket0To10', header: '0–10', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'bucket11To20', header: '11–20', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'bucket21To30', header: '21–30', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'bucket31Plus', header: '31+', cell: (info) => money(Number(info.getValue())) }
];

export function ReceivablesClient({ receivables }: { receivables: ReceivableRecord[] }) {
  const overdueRows = receivables.filter((row) => row.overdueDebt > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <SimpleBarChart data={byTop(receivables, (row) => row.clientName, (row) => row.totalDebt, 8)} title="Найбільша дебіторка по клієнтах" />
        <SimpleBarChart barColor="#fb7185" data={byTop(overdueRows, (row) => row.clientName, (row) => row.overdueDebt, 8)} title="Ризик: найбільша прострочка" />
      </div>
      <DataTable columns={columns} data={receivables} initialSorting={[{ id: 'totalDebt', desc: true }]} />
    </div>
  );
}
