'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from './Shell';
import KpiStrip from './KpiStrip';
import StationTable from './StationTable';
import TelemetryConsole from './TelemetryConsole';
import QcPanel from './QcPanel';
import Testbench from './Testbench';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { InvestigationPanel } from './InvestigationPanel';
import { useSystem } from './SystemContext';
import { SCENARIOS } from '@/lib/networkFeed';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

function ScenarioControls() {
    const { setScenario } = useSystem();
    return (
        <div className="card p-4">
            <h2 className="t-card-title mb-2">SCENARIO REPLAY</h2>
            <div className="grid grid-cols-2 gap-2">
                {SCENARIOS.map(s => (
                    <button key={s.id} onClick={() => setScenario(s.id)} className="t-meta text-left p-2 hover:bg-surface-hover border border-hairline rounded">
                        {s.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * The tab lives in the URL rather than in component state.
 *
 * The sidebar links to `/dashboard?tab=live`, `/dashboard?tab=qc` and
 * `/dashboard?tab=testbench`; with the tab held in `useState` those links all
 * landed on the default tab and the sidebar's active state could never
 * resolve. Reading and writing the search param makes the links real.
 */
const TABS = [
  { key: 'matrix', label: 'Station Matrix' },
  { key: 'live', label: 'Live Operations' },
  { key: 'qc', label: 'Rule-based classification' },
  { key: 'testbench', label: 'Testbench' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function isTab(v: string | null): v is TabKey {
  return TABS.some((t) => t.key === v);
}

function DashboardTabs() {
  const router = useRouter();
  const search = useSearchParams();
  const active = search.get('tab');
  const activeTab: TabKey = isTab(active) ? active : 'matrix';
  const { state } = useSystem();

  return (
    <>
      <div role="tablist" aria-label="Dashboard view" className="flex gap-1 border-b border-hairline">
        {TABS.map((tab) => {
          const selected = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() =>
                router.push(tab.key === 'matrix' ? '/dashboard' : `/dashboard?tab=${tab.key}`, {
                  scroll: false,
                })
              }
              className={
                selected
                  ? 'border-b-2 border-navy text-navy font-semibold'
                  : 'border-b-2 border-transparent text-ink-muted hover:text-ink'
              }
              style={{ padding: '10px 14px' }}
            >
              <span className="t-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-5">
        {activeTab === 'matrix' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr,300px] gap-5">
            <div className="flex flex-col gap-5">
              <LeafletMap />
              <StationTable />
            </div>
            <div className="flex flex-col gap-5">
              <ScenarioControls />
              {state.selectedStationId && <InvestigationPanel />}
            </div>
          </div>
        )}
        {activeTab === 'live' && <TelemetryConsole />}
        {activeTab === 'qc' && <QcPanel />}
        {activeTab === 'testbench' && <Testbench />}
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Shell breadcrumb="Operations Console">
      <div className="flex flex-col gap-5">
        <KpiStrip />
        <Suspense fallback={<LoadingSkeleton title="Loading view" variant="cards" />}>
          <DashboardTabs />
        </Suspense>
      </div>
    </Shell>
  );
}
