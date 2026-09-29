'use client';

import { clsx } from 'clsx';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useSystem } from '../dashboard/SystemContext';
import Shell from '../dashboard/Shell';
import KpiStrip from '../dashboard/KpiStrip';
import DataModeBadge from '../dashboard/DataModeBadge';
import { SCENARIOS, classificationLabel } from '@/lib/networkFeed';
import { getInitialSeededDataset } from '@/lib/anomalyLogic';

function summarise(packets: ReturnType<typeof getInitialSeededDataset>['stationPackets'][string]) {
  const flagged = packets.filter((p) => p.classification !== 'NOMINAL_OPERATION');
  const byStation = new Map<string, number>();
  for (const p of flagged) byStation.set(p.stationId, (byStation.get(p.stationId) ?? 0) + 1);
  const first = flagged[0];
  const last = packets[packets.length - 1];
  return {
    total: packets.length,
    flagged: flagged.length,
    byStation,
    first,
    recovered: Boolean(first) && last?.classification === 'NOMINAL_OPERATION',
  };
}

/**
 * §M — the demo lab.
 *
 * Rewritten. The previous build was a bare grid of buttons that rendered the
 * scenario's internal id ("normal") where a label belonged, showed no
 * provenance at all, and reported only a packet count — so a viewer could run
 * a storm scenario and read "120 packets" with no indication of whether the
 * engine flagged anything. The point of this page is to show the engine
 * discriminating a real atmospheric event from a real hardware fault, and it
 * now says which of the two happened and on how many ticks.
 */
export default function DemoPage() {
  const { state, setScenario } = useSystem();

  return (
    <Shell breadcrumb="Demo Lab">
      <div className="flex flex-col gap-5">
        <KpiStrip />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="t-section-title text-navy">Storm vs sensor</h1>
            <p className="t-body text-ink-muted">
              Run the same engine the console runs, against a controlled fault, and see which
              root cause it assigns. The testbench does this per station; this page is the
              one-screen version.
            </p>
          </div>
          <DataModeBadge />
        </div>

        <section className="card overflow-hidden" aria-label="Scenario control">
          <div className="border-b border-hairline px-5 py-3">
            <h2 className="t-card-title">Choose a scenario</h2>
            <p className="t-meta">
              Each scenario injects one fault into the engine and reports what came back.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-2 xl:grid-cols-4">
            {SCENARIOS.map((s) => {
              const selected = state.scenario === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScenario(s.id)}
                  aria-pressed={selected}
                  className={clsx(
                    'touch-target p-4 text-left transition-colors',
                    selected ? 'bg-surface-alt' : 'bg-card hover:bg-surface-hover'
                  )}
                >
                  <span
                    className={clsx(
                      't-card-title block',
                      selected && 'text-navy'
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="t-meta mt-1 block">{s.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card overflow-hidden" aria-label="Engine result">
          <div className="border-b border-hairline px-5 py-3">
            <h2 className="t-card-title">Engine result</h2>
            <p className="t-meta">Read from the packets the engine produced for the selected run.</p>
          </div>

          {!state.scenario ? (
            <p className="px-5 py-8 t-body text-ink-muted">
              Select a scenario above to run the QC engine.
            </p>
          ) : (
            <EngineResult packets={state.packets} />
          )}
        </section>
      </div>
    </Shell>
  );
}

function EngineResult({ packets }: { packets: ReturnType<typeof getInitialSeededDataset>['stationPackets'][string] }) {
  const s = summarise(packets);
  const flagged = s.flagged > 0;

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        {flagged ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-healthy">
            <CheckCircle2 size={15} aria-hidden />
            {classificationLabel(s.first!.classification)} raised on {s.flagged} of {s.total}{' '}
            packets
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
            <XCircle size={15} aria-hidden />
            No anomaly raised — all {s.total} packets nominal
          </span>
        )}
        {flagged && (
          <span className="t-meta">
            {s.recovered ? '· recovered to Flag 1 by the end of the run' : '· still active at end of run'}
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-hairline pt-4 sm:grid-cols-4">
        <div>
          <dt className="t-label">Packets</dt>
          <dd className="t-mono text-[20px] font-semibold">{s.total}</dd>
        </div>
        <div>
          <dt className="t-label">Flagged</dt>
          <dd className="t-mono text-[20px] font-semibold">{s.flagged}</dd>
        </div>
        <div>
          <dt className="t-label">Stations affected</dt>
          <dd className="t-mono text-[20px] font-semibold">{s.byStation.size}</dd>
        </div>
        <div>
          <dt className="t-label">Outcome</dt>
          <dd className="t-card-title">{flagged ? (s.recovered ? 'Recovered' : 'Active') : 'Nominal'}</dd>
        </div>
      </dl>

      {flagged && s.first && (
        <div className="mt-4 rounded border border-hairline bg-surface-alt px-4 py-3">
          <p className="t-card-title">First flag — {s.first.xaiAttribution.diagnosticNote}</p>
          <p className="t-meta mt-1">
            {s.first.stationId} · {s.first.wmoFlag} · {classificationLabel(s.first.classification)} ·{' '}
            {s.first.operationalAction}
            {s.first.ticketId ? ` · ${s.first.ticketId}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
