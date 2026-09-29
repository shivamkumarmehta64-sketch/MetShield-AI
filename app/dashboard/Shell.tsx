'use client';

import { useState, type ReactNode } from 'react';
import { Suspense } from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { ProvenanceStrip } from './ProvenanceStrip';
import { useSystem } from './SystemContext';
import { SCENARIOS } from '@/lib/networkFeed';

interface ShellProps {
  breadcrumb: string;
  children: ReactNode;
}

/**
 * The operations shell.
 *
 * Every console page renders through this so the sidebar, the topbar and the
 * mobile drawer behaviour exist in exactly one place. The previous build had
 * each page composing `Topbar` + `Sidebar` by hand, which is how the pages
 * drifted apart.
 *
 * `useSearchParams` is read inside `Sidebar`, which is why the shell has to
 * suspend around it — Next 16 requires a Suspense boundary above any component
 * that calls it, or the route falls back to client-side rendering entirely.
 */
export default function Shell({ breadcrumb, children }: ShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  // Read for the scenario suffix only. The provenance itself comes from
  // `DATA_MODE`, not from this state — see ProvenanceStrip.
  const { state } = useSystem();
  const scenarioLabel = state.scenario
    ? (SCENARIOS.find((s) => s.id === state.scenario)?.label ?? null)
    : null;

  return (
    <div className="min-h-screen bg-page">
      <ProvenanceStrip scenarioLabel={scenarioLabel} />
      <Topbar breadcrumb={breadcrumb} onOpenNav={() => setNavOpen(true)} />
      <div className="lg:pl-[248px]">
        <Suspense fallback={null}>
          <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        </Suspense>
        <main id="main" className="px-4 py-5 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
