import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

export function TelemetryChart({
  data,
  dataKey,
  color,
  unit,
  domain = ['auto', 'auto'],
  height = 120
}: {
  data: any[];
  dataKey: string;
  color: string;
  unit: string;
  domain?: [number | string, number | string];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="timeIST"
            tick={{ fontSize: 10, fill: 'var(--chart-tick-ink)' }}
            tickMargin={8}
            stroke="var(--chart-axis)"
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 10, fill: 'var(--chart-tick-ink)' }}
            tickMargin={8}
            stroke="var(--chart-axis)"
            tickFormatter={(val) => `${val}${unit}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface-overlay)',
              borderColor: 'var(--border-strong)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-overlay)'
            }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'var(--surface-base)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}