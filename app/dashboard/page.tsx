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
import { type ScenarioId } from '@/lib/networkFeed';

import { getAuditLogRecords, generateAuditCsvContent, type StoredFaultEvent } from '@/lib/supabaseClient';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

function ScenarioControls() {
  const { state, setScenario } = useSystem();
  
  const handleExport = () => {
    let records = getAuditLogRecords();
    if (records.length === 0) {
      // Seed with representative audit baseline if empty
      const baselineEvent: StoredFaultEvent = {
        eventId: 'EVT-INIT-01',
        stationId: 'AWS-DEL-04',
        timestamp: new Date().toISOString(),
        timeIST: new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(new Date()),
        parameter: 'temperature',
        rawVal: 54.2,
        imputedVal: 32.1,
        temperatureC: 54.2,
        pres_hPa: 1008.4,
        rh_pct: 65.0,
        classification: 'SENSOR_SPIKE',
        severity: 'CRITICAL',
        xaiAttribution: {
          tempWeight: 85,
          pressWeight: 8,
          humWeight: 7,
          explanation: 'Isolated step discontinuity on dry-bulb thermistor channel without thermodynamic coupling.'
        },
        recommendedAction: 'Quarantine observation and flag for transducer bridge recalibration.'
      };
      records = [baselineEvent];
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
            {triggerButton('normal', 'Reset Network (Nominal)')}
            {triggerButton('temp-spike', 'Simulate Thermistor Open-Circuit')}
            {triggerButton('frozen', 'Simulate Probe Float Lock')}
            {triggerButton('pressure-drop', 'Simulate Convective Front Dynamics')}
          </div>
        </div>
        
        <div className="border-t border-hairline pt-4">
          <div className="t-label text-ink-muted mb-2 text-[10px]">DATA EXPORT</div>
          <button 
            onClick={handleExport}
            className="px-3 py-2 text-[12px] font-mono border border-hairline-strong rounded text-navy hover:bg-surface-alt flex items-center gap-2"
          >
            Export QC Audit Log (.csv)
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
