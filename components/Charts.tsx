'use client';

import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money, percent } from '@/lib/format';

const COLORS = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#ea580c'];

function ChartShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="h-80 rounded-xl border bg-white p-4">
      {title ? <div className="mb-4 text-sm font-semibold text-slate-700">{title}</div> : null}
      <div className={title ? 'h-[calc(100%-2rem)]' : 'h-full'}>{children}</div>
    </div>
  );
}

export function SimpleBarChart({ data, bars = ['value'], title, barLabels = {} }: { data: Array<Record<string, string | number>>; bars?: string[]; title?: string; barLabels?: Record<string, string> }) {
  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value: number) => money(Number(value))} />
          {bars.length > 1 ? <Legend /> : null}
          {bars.map((bar, index) => <Bar dataKey={bar} fill={COLORS[index % COLORS.length]} key={bar} name={barLabels[bar] ?? bar} />)}
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function SimplePieChart({ data, title }: { data: Array<{ name: string; value: number }>; title?: string }) {
  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie cx="50%" cy="50%" data={data} dataKey="value" innerRadius={52} nameKey="name" outerRadius={92} paddingAngle={2}>
            {data.map((entry, index) => <Cell fill={COLORS[index % COLORS.length]} key={`${entry.name}-${index}`} />)}
          </Pie>
          <Tooltip formatter={(value: number, _name, item) => [`${money(Number(value))} (${percent((Number(value) / Math.max(data.reduce((sum, row) => sum + row.value, 0), 1)) * 100)})`, item.payload?.name ?? '']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function DailySalesChart({ data, title }: { data: Array<{ label: string; turnover: number; grossPlanTurnover: number; tireTurnover: number }>; title?: string }) {
  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip formatter={(value: number) => money(Number(value))} />
          <Legend />
          <Bar dataKey="turnover" fill="#2563eb" name="Оборот" />
          <Line dataKey="grossPlanTurnover" dot={false} name="Оборот для валового плану" stroke="#0f766e" strokeWidth={2} type="monotone" />
          <Line dataKey="tireTurnover" dot={false} name="Шини" stroke="#d97706" strokeWidth={2} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
