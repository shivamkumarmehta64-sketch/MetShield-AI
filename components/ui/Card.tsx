import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface-raised)] border border-[var(--border-strong)] rounded-2xl shadow-[var(--shadow-raised)] ${className}`}>
      {children}
    </div>
  );
}
