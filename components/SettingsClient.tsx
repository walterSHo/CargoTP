'use client';

import { DataTable } from './DataTable';
import { money } from '@/lib/format';
import type { MonthlyPlan } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<MonthlyPlan>[] = [
  { accessorKey: 'month', header: 'Місяць' },
  { accessorKey: 'grossPlan', header: 'Валовий план місяця', cell: (info) => money(Number(info.getValue())) }
];

export function SettingsClient({ monthlyPlans }: { monthlyPlans: MonthlyPlan[] }) {
  return <DataTable columns={columns} data={monthlyPlans} initialSorting={[{ id: 'month', desc: true }]} />;
}
