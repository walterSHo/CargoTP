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
  { accessorKey: 'unifiedClientCode', header: 'Єдиний код' },
  { accessorKey: 'clientCode', header: 'Код клієнта' },
  { accessorKey: 'clientName', header: 'Клієнт' },
  { accessorKey: 'brand', header: 'Бренд' },
  { accessorKey: 'productGroup', header: 'Група' },
  { accessorKey: 'productCode', header: 'Товар' },
  { accessorKey: 'amountEur', header: 'Оборот', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'netMargin', header: 'Маржа', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'discountPercent', header: 'Знижка', cell: (info) => percent(Number(info.getValue())) }
];

export function TiresClient({ summary }: { summary: TireSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleBarChart data={summary.topClients} title="Топ клієнтів по шинах" valueLabel="Оборот шин" />
        <SimpleBarChart data={summary.topBrands} title="Топ брендів шин" valueLabel="Оборот шин" />
      </div>
      <section className="grid gap-4 lg:grid-cols-3">
        <SimpleBarChart data={summary.growingClients.slice(0, 8).map((row) => ({ name: row.name, value: row.delta }))} title="Клієнти зі зростанням" valueLabel="Приріст" />
        <SimpleBarChart data={summary.fallingClients.slice(0, 8).map((row) => ({ name: row.name, value: Math.abs(row.delta) }))} title="Клієнти зі спадом" valueLabel="Падіння" />
        <SimpleBarChart data={summary.problematicClients} title="Клієнти з прострочкою" valueLabel="Прострочка" />
      </section>
      <DataTable columns={columns} data={summary.rows} initialSorting={[{ id: 'clientCode', desc: false }, { id: 'date', desc: false }]} />
    </div>
  );
}
