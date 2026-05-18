'use client';

import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Label, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money, percent } from '@/lib/format';

const COLORS = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#ea580c'];

function ChartShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="h-80 rounded-[18px] border border-line bg-[rgba(10,18,33,0.94)] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.2)]">
      {title ? <div className="mb-4 text-sm font-semibold text-[var(--ink)]">{title}</div> : null}
      <div className={title ? 'h-[calc(100%-2rem)]' : 'h-full'}>{children}</div>
    </div>
  );
}

function TooltipShell({ children }: { children: ReactNode }) {
  return <div className="rounded-[14px] border border-line bg-[rgba(8,15,28,0.96)] px-3 py-2 text-sm text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)]">{children}</div>;
}

function BarChartTooltip({
  active,
  label,
  payload,
  valueFormatter
}: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string; value?: number | string }>;
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <TooltipShell>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div className="flex items-center justify-between gap-3" key={`${entry.name}-${entry.value}`}>
            <span className="text-muted">{entry.name}</span>
            <strong>{valueFormatter(Number(entry.value ?? 0))}</strong>
          </div>
        ))}
      </div>
    </TooltipShell>
  );
}

function DailyChartTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; payload?: { clients?: number } }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <TooltipShell>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">День {label}</div>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div className="flex items-center justify-between gap-3" key={`${entry.name}-${entry.value}`}>
            <span className="text-muted">{entry.name}</span>
            <strong>{money(Number(entry.value ?? 0))}</strong>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2">
          <span className="text-muted">Активні клієнти</span>
          <strong>{payload[0]?.payload?.clients ?? 0}</strong>
        </div>
      </div>
    </TooltipShell>
  );
}

export function SimpleBarChart({
  data,
  bars = ['value'],
  title,
  barLabels = {},
  valueFormatter = money,
  barColor = '#4ea1ff',
  valueLabel = 'Значення'
}: {
  data: Array<Record<string, string | number>>;
  bars?: string[];
  title?: string;
  barLabels?: Record<string, string>;
  valueFormatter?: (value: number) => string;
  barColor?: string;
  valueLabel?: string;
}) {
  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(141,162,199,0.16)" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <YAxis stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <Tooltip
            content={(props) => <BarChartTooltip {...props} valueFormatter={valueFormatter} />}
            cursor={{ fill: 'rgba(78,161,255,0.08)' }}
          />
          {bars.length > 1 ? <Legend /> : null}
          {bars.map((bar, index) => (
            <Bar
              dataKey={bar}
              fill={bars.length === 1 ? barColor : COLORS[index % COLORS.length]}
              key={bar}
              name={barLabels[bar] ?? (bars.length === 1 ? valueLabel : bar)}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function SimplePieChart({ data, title }: { data: Array<{ name: string; value: number }>; title?: string }) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie cx="50%" cy="50%" data={data} dataKey="value" innerRadius={52} nameKey="name" outerRadius={92} paddingAngle={2}>
            {data.map((entry, index) => <Cell fill={COLORS[index % COLORS.length]} key={`${entry.name}-${index}`} />)}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null;
                return (
                  <g>
                    <text fill="#f1f5ff" fontSize="14" fontWeight="800" textAnchor="middle" x={viewBox.cx} y={viewBox.cy - 16}>
                      {money(total)}
                    </text>
                    <text fill="rgba(141,162,199,0.92)" fontSize="12" fontWeight="700" textAnchor="middle" x={viewBox.cx} y={viewBox.cy + 2}>
                      -
                    </text>
                    <text fill="rgba(141,162,199,0.92)" fontSize="12" fontWeight="700" textAnchor="middle" x={viewBox.cx} y={viewBox.cy + 20}>
                      {title ?? 'Структура'}
                    </text>
                  </g>
                );
              }}
              position="center"
            />
          </Pie>
          <Tooltip
            contentStyle={{ background: 'rgba(8,15,28,0.96)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: '16px', color: '#e5eefc' }}
            formatter={(value: number, _name, item) => [`${money(Number(value))} (${percent((Number(value) / Math.max(total, 1)) * 100)})`, item.payload?.name ?? '']}
            labelStyle={{ color: '#8da2c7' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function DailySalesChart({ data, title }: { data: Array<{ label: string; turnover: number; grossPlanTurnover: number; tireTurnover: number; clients: number }>; title?: string }) {
  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke="rgba(141,162,199,0.16)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <YAxis stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <Tooltip
            content={(props) => <DailyChartTooltip {...props} />}
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
