'use client';

import { DataTable } from './DataTable';
import { SimpleBarChart } from './Charts';
import { money, percent } from '@/lib/format';
import type { ColumnDef } from '@tanstack/react-table';

type Row = {
  productGroup: string;
  planPercent: number;
  shareOfGrossPlan: number;
  planAmount: number;
  factFromSales: number;
  completionPercent: number;
};

function statusClass(value: number) {
  if (value < 95) return 'text-red-600 font-semibold';
  if (value <= 100) return 'text-green-600 font-semibold';
  return 'text-emerald-500 font-bold';
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'productGroup', header: 'Група' },
  { accessorKey: 'planPercent', header: 'План %', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'shareOfGrossPlan', header: 'Частка від валового плану', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'planAmount', header: 'План', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'factFromSales', header: 'Факт із продажів', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'completionPercent', header: '% виконання', cell: (info) => <span className={statusClass(Number(info.getValue()))}>{percent(Number(info.getValue()))}</span> }
];

export function GroupPlanClient({ rows }: { rows: Row[] }) {
  return (
    <>
      <SimpleBarChart
        data={rows.map((row) => ({ name: row.productGroup, plan: row.planAmount, fact: row.factFromSales }))}
        bars={['plan', 'fact']}
        title="План проти факту за групами"
        barLabels={{ plan: 'План', fact: 'Факт із продажів' }}
        valueLabel="Сума"
      />
      <DataTable columns={columns} data={rows} initialSorting={[{ id: 'planAmount', desc: true }]} />
    </>
  );
}
