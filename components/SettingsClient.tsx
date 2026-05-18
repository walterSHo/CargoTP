'use client';

import { DataTable } from './DataTable';
import { money } from '@/lib/format';
import type { MonthlyPlan } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<MonthlyPlan>[] = [
  { accessorKey: 'month', header: 'Месяц' },
  { accessorKey: 'grossPlan', header: 'Валовый план месяца', cell: (info) => money(Number(info.getValue())) }
];

export function SettingsClient({ monthlyPlans }: { monthlyPlans: MonthlyPlan[] }) {
  return <DataTable columns={columns} data={monthlyPlans} />;
}
