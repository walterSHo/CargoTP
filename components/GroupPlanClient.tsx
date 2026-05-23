'use client';

import { DataTable } from './DataTable';
import { SimpleBarChart } from './Charts';
import { AGGREGATE_PLAN_GROUP } from '@/lib/constants';
import { money, percent } from '@/lib/format';
import type { ColumnDef } from '@tanstack/react-table';

type Row = {
  productGroup: string;
  planPercent: number;
  shareOfGrossPlan: number;
  planAmount: number;
  tempoAmount: number;
  tempoDelta?: number;
  tempoCompletionPercent?: number;
  factFromSales: number;
  requiredPerDay?: number;
  projectedCompletionPercent?: number;
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
  { accessorKey: 'tempoCompletionPercent', header: 'Темп %', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'tempoAmount', header: 'Темп сума', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'tempoDelta', header: 'Факт - темп', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'factFromSales', header: 'Факт із продажів', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'requiredPerDay', header: 'Треба в день', cell: (info) => money(Number(info.getValue())) },
  { accessorKey: 'projectedCompletionPercent', header: 'Прогноз %', cell: (info) => percent(Number(info.getValue())) },
  { accessorKey: 'completionPercent', header: '% виконання', cell: (info) => <span className={statusClass(Number(info.getValue()))}>{percent(Number(info.getValue()))}</span> }
];

export function GroupPlanClient({ rows }: { rows: Row[] }) {
  const visibleRows = rows.filter((row) => row.productGroup !== AGGREGATE_PLAN_GROUP);

  return (
    <>
      <SimpleBarChart
        data={visibleRows.map((row) => ({ name: row.productGroup, plan: row.planAmount, fact: row.factFromSales }))}
        bars={['plan', 'fact']}
        title="План проти факту за групами"
        barLabels={{ plan: 'План', fact: 'Факт із продажів' }}
        valueLabel="Сума"
      />
      <DataTable columns={columns} data={visibleRows} initialSorting={[{ id: 'planAmount', desc: true }]} />
    </>
  );
}
