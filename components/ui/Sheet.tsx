import React from 'react';

export function Sheet({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-[var(--surface-raised)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-raised)] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function FieldRow({
  label,
  value,
  action
}: {
  label: React.ReactNode,
  value?: React.ReactNode,
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0 min-touch">
      <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
      <div className="flex items-center gap-3">
        {value && <div className="text-sm text-[var(--text-secondary)]">{value}</div>}
        {action}
      </div>
    </div>
  );
}