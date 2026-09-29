'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Radio,
  Map,
  Cpu,
  AlertTriangle,
  Wrench,
  FlaskConical,
  BarChart3,
  FileCheck2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getNetworkSnapshot, computeKpis } from '@/lib/networkFeed';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Matching the path alone is ambiguous, so an optional query key disambiguates. */
  tabKey?: string;
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Monitor',
    items: [
      { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Station Telemetry', href: '/dashboard?tab=live', icon: Radio, tabKey: 'live' },
      { name: 'National Map', href: '/stations', icon: Map },
    ],
  },
  {
    label: 'Quality',
    items: [
      { name: 'Rule-based classification', href: '/dashboard?tab=qc', icon: Cpu, tabKey: 'qc' },
      { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
      { name: 'Field Operations', href: '/mobile', icon: Wrench },
      { name: 'Testbench', href: '/dashboard?tab=testbench', icon: FlaskConical, tabKey: 'testbench' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Audit Reports', href: '/audit-report', icon: FileCheck2 },
    ],
  },
];

/**
 * The previous build compared `item.href === pathname`, which can never be
 * true for a link carrying a query string — `/dashboard?tab=live` was
 * permanently unhighlighted. Active state is therefore resolved against the
 * path plus the tab key.
 */
function isActive(pathname: string, search: URLSearchParams | null, item: NavItem): boolean {
  const [base] = item.href.split('?');
  if (base !== pathname) return false;
  if (!item.tabKey) return !search || !search.get('tab');
  return search?.get('tab') === item.tabKey;
}

interface SidebarProps {
  /** Mobile drawer state, owned by the shell so the toggle lives in one place. */
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const search = useSearchParams();
  const kpis = computeKpis(getNetworkSnapshot());

  return (
    <>
      {/* Scrim: mobile only, and only while the drawer is open. */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-navy/40 lg:hidden"
        />
      )}

      <aside
        aria-label="Primary"
        className={clsx(
          'fixed top-0 bottom-0 left-0 z-50 w-[248px] flex flex-col border-r border-hairline bg-card',
          'transition-transform duration-150 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-hairline px-4" style={{ height: 56 }}>
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="w-2.5 h-2.5 bg-navy" aria-hidden />
            <span className="t-card-title text-navy tracking-wide">METSHIELD AI</span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="touch-target -mr-2 flex items-center justify-center lg:hidden text-ink-muted"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="t-label px-4 pt-5 pb-2">{section.label}</div>
              {section.items.map((item) => {
                const active = isActive(pathname, search, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex items-center gap-3 border-l-2 px-4 text-[13.5px] transition-colors',
                      active
                        ? 'border-l-sky-deep bg-sky-50/60 font-semibold text-navy'
                        : 'border-l-transparent text-ink-muted hover:bg-surface-hover hover:text-ink'
                    )}
                    style={{ height: 40 }}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.75}
                      className={active ? 'text-sky-deep' : 'text-ink-muted'}
                      aria-hidden
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* §D: the status block is computed from the engine, not typed in. */}
        <div className="border-t border-hairline px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-healthy"
              style={kpis.activeFaults > 0 ? { backgroundColor: 'var(--color-fault)' } : undefined}
              aria-hidden
            />
            <span className="t-label">
              {kpis.activeFaults > 0 ? 'DEGRADED' : 'OPERATIONAL'}
            </span>
          </div>
          <div className="t-meta mt-1 font-mono">
            {kpis.nominal}/{kpis.total} stations verified good
          </div>
          <div className="t-meta mt-2 font-mono text-[10px]">MoES / IMD · SIH 2026 · AEROTECH</div>
        </div>
      </aside>
    </>
  );
}
