'use client';

import { DataTable } from './DataTable';
import { SimpleBarChart } from './Charts';
import { money, percent } from '@/lib/format';
import type { SalesRecord } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';

type TireSummary = {
  rows: SalesRecord[];
  topClients: Array<{ name: string; value: number }>;
  topBrands: Array<{ name: string; value: number }>;
  stoppedClients: Array<{ name: string; previous: number; current: number; delta: number }>;
  growingClients: Array<{ name: string; previous: number; current: number; delta: number }>;
  fallingClients: Array<{ name: string; previous: number; current: number; delta: number }>;
  problematicClients: Array<{ name: string; value: number }>;
};

const columns: ColumnDef<SalesRecord>[] = [
  { accessorKey: 'date', header: 'Дата' },
  { accessorKey: 'clientName', header: 'Клиент' },
  { accessorKey: 'brand', header: 'Бренд' },
  { accessorKey: 'productGroup', header: 'Группа' },
  { accessorKey: 'productCode', header: 'Товар' },
  { accessorKey: 'amountEur', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'netMargin', header: 'Маржа', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'discountPercent', header: 'Скидка', cell: (info) => percent(Number(info.getValue())) }
];

export function TiresClient({ summary }: { summary: TireSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleBarChart data={summary.topClients} />
        <SimpleBarChart data={summary.topBrands} />
      </div>
      <section className="grid gap-4 lg:grid-cols-3">
        <SimpleBarChart data={summary.growingClients.slice(0, 8).map((row) => ({ name: row.name, value: row.delta }))} />
        <SimpleBarChart data={summary.fallingClients.slice(0, 8).map((row) => ({ name: row.name, value: Math.abs(row.delta) }))} />
        <SimpleBarChart data={summary.problematicClients} />
      </section>
      <DataTable columns={columns} data={summary.rows} />
    </div>
  );
}
