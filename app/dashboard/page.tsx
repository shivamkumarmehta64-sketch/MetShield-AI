'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
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
  const { state, setScenario } = useSystem();

  // Which scenario the console is actually replaying. `state.scenario` is null
  // until the operator picks one, and the snapshot that drives every other
  // panel on this page comes from getNetworkSnapshot() — so until a pick has
  // been made the header must say so rather than name a scenario that is not
  // the one feeding the KPIs above.
  const active = SCENARIOS.find((s) => s.id === state.scenario) ?? null;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-hairline bg-surface-alt px-4 py-3">
        <h2 className="t-label text-ink-muted mb-0.5">RUNNING SCENARIO</h2>
        <div className="t-card-title text-navy">{active ? active.label : 'Default network run'}</div>
      </div>
      <div className="flex flex-col p-2">
        {SCENARIOS.map((s) => {
          const isActive = s.id === state.scenario;
          return (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              aria-pressed={isActive}
              className={`flex flex-col items-start px-3 py-2.5 rounded text-left transition-colors border ${
                isActive
                  ? 'bg-telemetry/5 border-telemetry/30'
                  : 'border-transparent hover:bg-surface-hover'
              }`}
            >
              <div className="flex w-full items-center justify-between mb-0.5">
                <span
                  className={
                    isActive
                      ? 't-card-title text-[13.5px] text-telemetry-text'
                      : 't-card-title text-[13.5px] text-ink'
                  }
                >
                  {s.label}
                </span>
                {isActive && <Check size={14} className="text-telemetry-text shrink-0" />}
              </div>
              <span
                className={`text-[11.5px] line-clamp-1 leading-snug ${
                  isActive ? 'text-telemetry-text/80' : 'text-ink-muted'
                }`}
              >
                {s.description}
              </span>
            </button>
          );
        })}
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
  { key: 'live', label: 'Station Telemetry' },
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
      {/* The four tab labels are ~450px of text in total, so a nowrap flex row
          pushes the last tab past a 390px viewport and gives the whole document
          a horizontal scrollbar. Scrolling the tab strip is contained; the
          document is not. */}
      <div
        role="tablist"
        aria-label="Dashboard view"
        className="flex gap-1 border-b border-hairline overflow-x-auto"
      >
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
                  ? 'border-b-2 border-sky-deep text-sky-deep font-semibold shrink-0'
                  : 'border-b-2 border-transparent text-ink-muted hover:text-ink shrink-0'
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
