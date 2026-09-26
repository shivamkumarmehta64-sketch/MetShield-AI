import React from 'react';

export function MetricTile({
  label,
  value,
  unit = '',
  trend,
  status = 'nominal',
  icon
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { direction: 'up' | 'down' | 'flat', value: string };
  status?: 'nominal' | 'watch' | 'serious' | 'critical' | 'lost';
  icon?: React.ReactNode;
}) {
  const statusColor = `var(--status-${status})`;

  return (
    <div className="flex flex-col p-4 bg-[var(--surface-raised)] rounded-xl border border-[var(--border-subtle)] shadow-[var(--shadow-raised)]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
        {icon && <div className="text-[var(--text-muted)] w-4 h-4">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1 mt-auto">
        <span className="text-2xl font-bold font-mono tracking-tight tabular-nums text-[var(--text-primary)]">{value}</span>
        {unit && <span className="text-sm font-medium text-[var(--text-muted)]">{unit}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2 text-xs font-medium" style={{ color: trend.direction === 'flat' ? 'var(--text-muted)' : statusColor }}>
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
        </div>
      )}
    </div>
  );
}
