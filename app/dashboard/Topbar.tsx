'use client';

import { useEffect, useState } from 'react';
import { Menu, Bell, Settings } from 'lucide-react';
import DataModeBadge from './DataModeBadge';
import { getNetworkSnapshot, computeKpis } from '@/lib/networkFeed';

interface TopbarProps {
  breadcrumb: string;
  onOpenNav: () => void;
}

export default function Topbar({ breadcrumb, onOpenNav }: TopbarProps) {
  // Rendered as a fixed string until mounted: a wall clock read during render
  // differs between server and client and trips a hydration mismatch.
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleTimeString('en-GB', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const kpis = computeKpis(getNetworkSnapshot());
  const alerts = kpis.activeAnomalies;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-card px-4 lg:px-6" style={{ height: 56 }}>
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenNav}
        className="touch-target -ml-2 flex items-center justify-center text-ink-muted lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0">
        <div className="t-card-title text-navy truncate">National AWS Quality Management System</div>
        <div className="t-label truncate">{breadcrumb}</div>
      </div>

      <div className="ml-auto flex items-center gap-2 lg:gap-3">
        <div className="hidden sm:block">
          <DataModeBadge />
        </div>

        <div className="hidden md:flex flex-col items-end leading-tight">
          <span className="t-label">Last update</span>
          <span className="t-meta font-mono text-[11.5px]">
            {/* The newest packet in the benchmark pass, not the wall clock. */}
            {new Date(getNetworkSnapshot().latestTimestamp).toISOString().slice(11, 19)} UTC
          </span>
        </div>

        <div className="hidden lg:flex flex-col items-end leading-tight">
          <span className="t-label">Console UTC</span>
          <span className="t-meta font-mono text-[11.5px]">{clock ?? '—'}</span>
        </div>

        <button
          type="button"
          aria-label={alerts > 0 ? `${alerts} active anomalies` : 'No active anomalies'}
          className="touch-target relative flex items-center justify-center text-ink-muted hover:text-ink"
        >
          <Bell size={19} />
          {alerts > 0 && (
            <span
              className="absolute top-2 right-2 min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-fault)', color: '#fff' }}
            >
              {alerts}
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label="Settings"
          className="touch-target flex items-center justify-center text-ink-muted hover:text-ink"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
