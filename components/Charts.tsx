'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function SimpleBarChart({ data, bars = ['value'] }: { data: Array<Record<string, string | number>>; bars?: string[] }) {
  return (
    <div className="h-80 rounded-xl border bg-white p-4">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {bars.map((bar, index) => <Bar dataKey={bar} fill={index === 0 ? '#2563eb' : '#22c55e'} key={bar} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
