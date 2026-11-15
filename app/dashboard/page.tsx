'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

import Shell from './Shell';
import KpiStrip from './KpiStrip';
import StationTable from './StationTable';
import QcPanel from './QcPanel';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { InvestigationPanel } from './InvestigationPanel';
import { useSystem } from './SystemContext';
import { type ScenarioId } from '@/lib/networkFeed';

import type { StoredFaultEvent } from '@/lib/supabaseClient';
import { type TelemetryPacket } from '@/lib/anomalyLogic';

/**
 * The map is client-only and 340 px tall below `sm`, 420 px above it. Without a
 * placeholder it mounted into zero height and pushed the console down as it
 * appeared — measured as 0.19 of the 0.22 layout shift on this route. The
 * placeholder reserves the same box, so the map fills space rather than creating it.
 */
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      className="card h-[340px] w-full animate-pulse sm:h-[420px]"
      role="status"
      aria-label="Loading national station map"
    />
  ),
});

/**
 * Chart-bearing tabs, split out of the initial bundle.
 *
 * Both were statically imported, so `recharts` shipped on first paint even
 * though `activeTab` starts at `matrix` and neither component rendered. They
 * now load when their tab is opened.
 */
const TelemetryConsole = dynamic(() => import('./TelemetryConsole'), {
  loading: () => <LoadingSkeleton title="Loading station telemetry" variant="cards" />,
});

const Testbench = dynamic(() => import('./Testbench'), {
  loading: () => <LoadingSkeleton title="Loading testbench" variant="cards" />,
});

function packetToAuditEvent(p: TelemetryPacket): StoredFaultEvent {
  const param = p.xaiAttribution.primaryParameter.toLowerCase();
  const rawVal =
    param.includes('temp')
      ? (p.raw.temperature ?? 0)
      : param.includes('press')
      ? (p.raw.pressure ?? 0)
      : (p.raw.humidity ?? 0);
  const imputedVal =
    param.includes('temp')
      ? (p.imputed.temperature ?? rawVal)
      : param.includes('press')
      ? (p.imputed.pressure ?? rawVal)
      : (p.imputed.humidity ?? rawVal);

  return {
    eventId: p.packetId,
    stationId: p.stationId,
    timestamp: new Date(p.timestamp).toISOString(),
    timeIST: p.timeIST,
    parameter: p.xaiAttribution.primaryParameter,
    rawVal,
    imputedVal,
    temperatureC: p.raw.temperature ?? undefined,
    pres_hPa: p.raw.pressure ?? undefined,
    rh_pct: p.raw.humidity ?? undefined,
    classification: p.classification,
    severity:
      p.classification === 'GENUINE_CONVECTIVE_EVENT'
        ? 'GENUINE_WEATHER'
        : p.wmoFlag === 'FLAG_4_CORRUPT_HARDWARE'
        ? 'CRITICAL'
        : p.wmoFlag === 'FLAG_1_VERIFIED_GOOD'
        ? 'INFO'
        : 'WARNING',
    xaiAttribution: {
      tempWeight: p.xaiAttribution.tempWeight,
      pressWeight: p.xaiAttribution.pressWeight,
      humWeight: p.xaiAttribution.humWeight,
      explanation: p.xaiAttribution.diagnosticNote,
    },
    recommendedAction: p.operationalAction,
  };
}

function ScenarioControls() {
  const { state, setScenario, resumeLive } = useSystem();
  
  const [isExporting, setIsExporting] = useState(false);

  // `@supabase/supabase-js` is ~239 KB unminified and was in this route's initial
  // chunk for two functions reached only by this button. Importing it here keeps
  // it off first paint and loads it the first time someone exports.
  //
  // The await makes this re-entrant, so the button is disabled while it runs:
  // a second click would otherwise start a second import and a second download.
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { getAuditLogRecords, generateAuditCsvContent } = await import('@/lib/supabaseClient');
      let records = getAuditLogRecords();
      if (records.length === 0) {
        const flaggedFromScenario = state.packets.filter((p) => p.classification !== 'NOMINAL_OPERATION');
        if (flaggedFromScenario.length > 0) {
          records = flaggedFromScenario.map(packetToAuditEvent);
        } else {
          const flaggedStations = state.snapshot.stations.filter((s) => s.health !== 'NOMINAL');
          const sourcePackets =
            flaggedStations.length > 0
              ? flaggedStations.map((s) => s.decidedBy)
              : state.snapshot.stations.map((s) => s.packet);
          records = sourcePackets.map(packetToAuditEvent);
        }
      }
      const csvContent = generateAuditCsvContent(records);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `NIC_MoES_QC_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const isActive = (id: ScenarioId) => state.scenario === id;

  const triggerButton = (id: ScenarioId, label: string) => {
    const active = isActive(id);
    return (
      <button
        type="button"
        onClick={() => setScenario(id)}
        className={`px-3 py-2 text-[12px] font-mono border rounded ${
          active 
            ? 'bg-navy text-white border-navy-deep' 
            : 'bg-card text-ink-muted border-hairline hover:bg-surface-hover hover:text-ink'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <details className="mt-5 card overflow-hidden group">
      <summary className="p-3 border-b border-hairline bg-surface-alt t-mono text-[11px] font-bold text-ink-faint hover:text-ink cursor-pointer flex justify-between items-center">
        <span>[🔧 Field Diagnostic & Bench Test Tool (Authorized Personnel Only)]</span>
        <span className="text-[10px] text-ink-muted group-open:hidden">Click to expand</span>
      </summary>
      
      <div className="p-4 bg-card flex flex-col gap-4">
        <div>
          <div className="t-label text-ink-muted mb-2 text-[10px]">INJECT FAULT SCENARIO</div>
          <div className="flex flex-wrap gap-2">
            {state.scenario !== null && (
              <button
                type="button"
                onClick={resumeLive}
                className="px-3 py-2 text-[12px] font-mono border rounded bg-healthy-bg text-healthy-text border-healthy-border hover:bg-emerald-100"
              >
                Resume Live Open-Meteo Feed
              </button>
            )}
            {triggerButton('normal', 'Reset Network (Nominal)')}
            {triggerButton('temp-spike', 'Simulate Thermistor Open-Circuit')}
            {triggerButton('frozen', 'Simulate Probe Float Lock')}
            {triggerButton('convective-storm', 'Simulate Convective Front Dynamics')}
          </div>
        </div>
        
        <div className="border-t border-hairline pt-4">
          <div className="t-label text-ink-muted mb-2 text-[10px]">DATA EXPORT</div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            aria-busy={isExporting}
            className="px-3 py-2 text-[12px] font-mono border border-hairline-strong rounded text-navy hover:bg-surface-alt flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Preparing export…' : 'Export QC Audit Log (.csv)'}
          </button>
        </div>
      </div>
    </details>
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

  return (
    <>
      {/* The four tab labels are ~450px of text in total, so a nowrap flex row
          pushes the last tab past a 390px viewport and gives the whole document
          a horizontal scrollbar. Scrolling the tab strip is contained; the
          document is not. */}
      {/* Phones wrap the tabs instead of scrolling them. A horizontal strip cut
          "Rule-based classification" to "RULE-B" with no affordance that the
          strip scrolled, so the fourth view looked absent. Wrapping shows all
          four; the single-line strip returns at `sm`. */}
      <div
        role="tablist"
        aria-label="Dashboard view"
        className="flex flex-wrap sm:flex-nowrap gap-1 border-b border-hairline sm:overflow-x-auto"
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
          <div className="grid grid-cols-1 xl:grid-cols-[1fr,360px] gap-5">
            <div className="flex flex-col gap-5 min-w-0">
              <LeafletMap />
              <StationTable />
            </div>
            <div className="flex flex-col gap-5">
              <InvestigationPanel />
              <ScenarioControls />
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
    <Shell breadcrumb="Dashboard">
      <div className="flex flex-col gap-5">
        <KpiStrip />
        <Suspense fallback={<LoadingSkeleton title="Loading view" variant="cards" />}>
          <DashboardTabs />
        </Suspense>
      </div>
    </Shell>
  );
}
