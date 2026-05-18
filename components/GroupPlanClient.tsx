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
  factAmount: number;
  factFromSales: number;
  variance: number;
  completionPercent: number;
};

function statusClass(value: number) {
  if (value < 95) return 'text-red-600 font-semibold';
  if (value <= 100) return 'text-green-600 font-semibold';
  return 'text-emerald-500 font-bold';
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'productGroup', header: 'Группа' },
  { accessorKey: 'planPercent', header: 'План %', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'shareOfGrossPlan', header: 'Доля от валового плана', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'planAmount', header: 'План', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'factAmount', header: 'Факт из файла', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'factFromSales', header: 'Факт из продаж', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'variance', header: 'Отклонение', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'completionPercent', header: '% выполнения', cell: (info) => <span className={statusClass(Number(info.getValue()))}>{percent(Number(info.getValue()))}</span> }
];

export function GroupPlanClient({ rows }: { rows: Row[] }) {
  return (
    <>
      <SimpleBarChart data={rows.map((row) => ({ name: row.productGroup, plan: row.planAmount, fact: row.factFromSales }))} bars={['plan', 'fact']} />
      <DataTable columns={columns} data={rows} />
    </>
  );
}
