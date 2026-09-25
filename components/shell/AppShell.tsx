'use client';

import React from 'react';

export interface AppShellProps {
  children: React.ReactNode;
  variant: 'console' | 'field';
  header?: React.ReactNode;
  nav?: React.ReactNode;
  language?: 'en' | 'hi';
}

export function AppShell({ children, variant, header, nav }: AppShellProps) {
  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-[var(--accent-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] ${variant === 'field' ? 'theme-field' : 'theme-console'}`}>
      {header && <div className="sticky top-0 z-50 shrink-0">{header}</div>}
      <main className={`flex-1 flex flex-col ${variant === 'field' ? 'pb-safe' : ''}`}>
        {children}
      </main>
      {nav && <div className="shrink-0">{nav}</div>}
    </div>
  );
}
