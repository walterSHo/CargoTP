'use client';

import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money, percent } from '@/lib/format';

const COLORS = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#ea580c'];

function ChartShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="h-80 rounded-[28px] border border-line bg-[linear-gradient(180deg,rgba(13,23,42,0.95),rgba(9,16,30,0.95))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
      {title ? <div className="mb-4 text-sm font-semibold text-[var(--ink)]">{title}</div> : null}
      <div className={title ? 'h-[calc(100%-2rem)]' : 'h-full'}>{children}</div>
    </div>
  );
}

export function SimpleBarChart({
  data,
  bars = ['value'],
  title,
  barLabels = {},
  valueFormatter = money
}: {
  data: Array<Record<string, string | number>>;
  bars?: string[];
  title?: string;
  barLabels?: Record<string, string>;
  valueFormatter?: (value: number) => string;
}) {
  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(141,162,199,0.16)" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <YAxis stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: 'rgba(8,15,28,0.96)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: '16px', color: '#e5eefc' }}
            cursor={{ fill: 'rgba(78,161,255,0.08)' }}
            formatter={(value: number) => valueFormatter(Number(value))}
            labelStyle={{ color: '#8da2c7' }}
          />
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
          <Tooltip
            contentStyle={{ background: 'rgba(8,15,28,0.96)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: '16px', color: '#e5eefc' }}
            formatter={(value: number, _name, item) => [`${money(Number(value))} (${percent((Number(value) / Math.max(data.reduce((sum, row) => sum + row.value, 0), 1)) * 100)})`, item.payload?.name ?? '']}
            labelStyle={{ color: '#8da2c7' }}
          />
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
          <CartesianGrid stroke="rgba(141,162,199,0.16)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <YAxis stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: 'rgba(8,15,28,0.96)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: '16px', color: '#e5eefc' }}
            formatter={(value: number) => money(Number(value))}
            labelStyle={{ color: '#8da2c7' }}
          />
          <Legend />
          <Bar dataKey="turnover" fill="#4ea1ff" name="Оборот" radius={[8, 8, 0, 0]} />
          <Line dataKey="grossPlanTurnover" dot={false} name="Оборот для валового плану" stroke="#2dd4bf" strokeWidth={2.5} type="monotone" />
          <Line dataKey="tireTurnover" dot={false} name="Шини" stroke="#f59e0b" strokeWidth={2.5} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
