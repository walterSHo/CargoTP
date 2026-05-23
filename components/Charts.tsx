'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Label, Legend, Line, Pie, PieChart, ResponsiveContainer, Sector, Tooltip, XAxis, YAxis } from 'recharts';
import { money, percent } from '@/lib/format';

const COLORS = ['#2563eb', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#ea580c'];

function shortLabel(value: string | number, limit = 16) {
  const label = String(value ?? '');
  return label.length > limit ? `${label.slice(0, Math.max(limit - 1, 8))}…` : label;
}

function ChartShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="chart-shell-card motion-fade-up h-80 rounded-[18px] border border-line bg-[rgba(10,18,33,0.94)] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.2)]">
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
  valueFormatter,
  totalsByKey
}: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string | number; value?: number | string; dataKey?: string | number; color?: string }>;
  valueFormatter: (value: number) => string;
  totalsByKey?: Record<string, number>;
}) {
  if (!active || !payload?.length) return null;

  return (
    <TooltipShell>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div className="flex items-center justify-between gap-3" key={`${entry.name}-${entry.value}`}>
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color ?? '#4ea1ff' }} />
              <span>{entry.name}</span>
            </span>
            <span className="text-right">
              <strong>{valueFormatter(Number(entry.value ?? 0))}</strong>
              {entry.dataKey && totalsByKey?.[String(entry.dataKey)] ? (
                <span className="ml-2 text-xs text-muted">{percent((Number(entry.value ?? 0) / totalsByKey[String(entry.dataKey)]) * 100)}</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </TooltipShell>
  );
}

function DailyChartTooltip({
  active,
  payload,
  label,
  turnoverTotal
}: {
  active?: boolean;
  payload?: Array<{ name?: string | number; value?: number | string; payload?: { clients?: number } }>;
  label?: string | number;
  turnoverTotal: number;
}) {
  if (!active || !payload?.length) return null;

  const turnover = Number(payload.find((entry) => entry.name === 'Оборот')?.value ?? 0);

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
          <span className="text-muted">Частка дня</span>
          <strong>{percent((turnover / Math.max(turnoverTotal, 1)) * 100)}</strong>
        </div>
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const totalsByKey = useMemo(
    () => Object.fromEntries(bars.map((bar) => [bar, data.reduce((sum, row) => sum + Number(row[bar] ?? 0), 0)])),
    [bars, data]
  );

  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={data}
          onMouseLeave={() => setActiveIndex(null)}
          onMouseMove={(state) => setActiveIndex(typeof state.activeTooltipIndex === 'number' ? state.activeTooltipIndex : null)}
        >
          <CartesianGrid stroke="rgba(141,162,199,0.16)" strokeDasharray="3 3" />
          <XAxis dataKey="name" interval={0} minTickGap={12} stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} tickFormatter={(value) => shortLabel(value)} />
          <YAxis stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <Tooltip
            content={(props: {
              active?: boolean;
              label?: string | number;
              payload?: Array<{ name?: string | number; value?: number | string; dataKey?: string | number; color?: string }>;
            }) => <BarChartTooltip {...props} totalsByKey={totalsByKey} valueFormatter={valueFormatter} />}
            cursor={{ fill: 'rgba(78,161,255,0.08)', radius: 10 }}
          />
          {bars.length > 1 ? <Legend formatter={(value) => <span className="text-xs font-medium text-[var(--ink)]">{barLabels[String(value)] ?? String(value)}</span>} /> : null}
          {bars.map((bar, index) => (
            <Bar
              activeBar={{ fillOpacity: 1, stroke: 'rgba(255,255,255,0.32)', strokeWidth: 1 }}
              animationBegin={index * 90}
              animationDuration={620}
              animationEasing="ease-out"
              dataKey={bar}
              fill={bars.length === 1 ? barColor : COLORS[index % COLORS.length]}
              key={bar}
              name={barLabels[bar] ?? (bars.length === 1 ? valueLabel : bar)}
              radius={[4, 4, 0, 0]}
            >
              {data.map((row, rowIndex) => {
                const fill = bars.length === 1 ? barColor : COLORS[index % COLORS.length];
                const isMuted = activeIndex !== null && activeIndex !== rowIndex;
                return (
                  <Cell
                    fill={fill}
                    fillOpacity={isMuted ? 0.42 : 1}
                    key={`${bar}-${String(row.name ?? rowIndex)}`}
                    stroke={activeIndex === rowIndex ? 'rgba(255,255,255,0.2)' : 'transparent'}
                    strokeWidth={1}
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function SimplePieChart({ data, title }: { data: Array<{ name: string; value: number }>; title?: string }) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={(props: { outerRadius?: number }) => (
              <g>
                <Sector {...props} outerRadius={Number(props.outerRadius ?? 92) + 8} cornerRadius={8} />
                <Sector {...props} fill="rgba(255,255,255,0.15)" innerRadius={Number(props.outerRadius ?? 92) + 11} outerRadius={Number(props.outerRadius ?? 92) + 13} />
              </g>
            )}
            animationDuration={700}
            animationEasing="ease-out"
            cx="50%"
            cy="50%"
            data={data}
            dataKey="value"
            innerRadius={52}
            nameKey="name"
            onMouseEnter={(_, index) => setActiveIndex(index)}
            outerRadius={92}
            paddingAngle={2}
          >
            {data.map((entry, index) => <Cell fill={COLORS[index % COLORS.length]} key={`${entry.name}-${index}`} />)}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null;
                return (
                  <g>
                    <text fill="#f1f5ff" fontSize="14" fontWeight="800" textAnchor="middle" x={viewBox.cx} y={Number(viewBox.cy ?? 0) - 16}>
                      {money(total)}
                    </text>
                    <text fill="rgba(141,162,199,0.92)" fontSize="12" fontWeight="700" textAnchor="middle" x={viewBox.cx} y={Number(viewBox.cy ?? 0) + 2}>
                      -
                    </text>
                    <text fill="rgba(141,162,199,0.92)" fontSize="12" fontWeight="700" textAnchor="middle" x={viewBox.cx} y={Number(viewBox.cy ?? 0) + 20}>
                      {title ?? 'Структура'}
                    </text>
                  </g>
                );
              }}
              position="center"
            />
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const entry = payload[0];
              return (
                <TooltipShell>
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{entry.name}</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-muted">Оборот</span>
                    <strong>{money(Number(entry.value ?? 0))}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-muted">Частка</span>
                    <strong>{percent((Number(entry.value ?? 0) / Math.max(total, 1)) * 100)}</strong>
                  </div>
                </TooltipShell>
              );
            }}
          />
          <Legend formatter={(value) => <span className="text-xs font-medium text-[var(--ink)]">{shortLabel(value, 20)}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function DailySalesChart({ data, title }: { data: Array<{ label: string; turnover: number; grossPlanTurnover: number; tireTurnover: number; clients: number }>; title?: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const turnoverTotal = useMemo(() => data.reduce((sum, row) => sum + row.turnover, 0), [data]);

  return (
    <ChartShell title={title}>
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart
          data={data}
          onMouseLeave={() => setActiveIndex(null)}
          onMouseMove={(state) => setActiveIndex(typeof state.activeTooltipIndex === 'number' ? state.activeTooltipIndex : null)}
        >
          <CartesianGrid stroke="rgba(141,162,199,0.16)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <YAxis stroke="rgba(141,162,199,0.75)" tick={{ fill: 'rgba(141,162,199,0.82)', fontSize: 12 }} />
          <Tooltip
            content={(props: {
              active?: boolean;
              label?: string | number;
              payload?: Array<{ name?: string | number; value?: number | string; payload?: { clients?: number } }>;
            }) => <DailyChartTooltip {...props} turnoverTotal={turnoverTotal} />}
            cursor={{ stroke: 'rgba(78,161,255,0.35)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
          />
          <Legend formatter={(value) => <span className="text-xs font-medium text-[var(--ink)]">{String(value)}</span>} />
          <Bar activeBar={{ fillOpacity: 1, stroke: 'rgba(255,255,255,0.28)', strokeWidth: 1 }} animationDuration={700} dataKey="turnover" fill="#4ea1ff" name="Оборот" radius={[8, 8, 0, 0]}>
            {data.map((row, rowIndex) => (
              <Cell
                fill="#4ea1ff"
                fillOpacity={activeIndex !== null && activeIndex !== rowIndex ? 0.42 : 1}
                key={`${row.label}-${rowIndex}`}
                stroke={activeIndex === rowIndex ? 'rgba(255,255,255,0.2)' : 'transparent'}
                strokeWidth={1}
              />
            ))}
          </Bar>
          <Line activeDot={{ fill: '#2dd4bf', r: 5, stroke: '#dffff7', strokeWidth: 1.5 }} animationDuration={780} dataKey="grossPlanTurnover" dot={{ fill: '#2dd4bf', r: 0 }} name="Оборот для валового плану" stroke="#2dd4bf" strokeWidth={2.5} type="monotone" />
          <Line activeDot={{ fill: '#f59e0b', r: 5, stroke: '#fff4db', strokeWidth: 1.5 }} animationDuration={840} dataKey="tireTurnover" dot={{ fill: '#f59e0b', r: 0 }} name="Шини" stroke="#f59e0b" strokeWidth={2.5} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
