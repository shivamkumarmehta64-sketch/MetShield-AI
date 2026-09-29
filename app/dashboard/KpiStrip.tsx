'use client';

import { useMemo } from 'react';
import { clsx } from 'clsx';
import { Activity, AlertTriangle, Gauge, Radio, ShieldCheck } from 'lucide-react';
import { computeKpis, getNetworkSnapshot, DATA_MODE } from '@/lib/networkFeed';
import type { DataMode } from '@/lib/networkFeed';

type Tone = 'healthy' | 'warning' | 'weather' | 'fault' | 'telemetry' | 'neutral';

const TONE_TEXT: Record<Tone, string> = {
  healthy: 'text-healthy',
  warning: 'text-warning',
  weather: 'text-weather',
  fault: 'text-fault',
  telemetry: 'text-telemetry',
  neutral: 'text-ink',
};

interface Kpi {
  label: string;
  value: string;
  /** Stated in words, not implied by the colour. §E */
  status: string;
  detail: string;
  Icon: typeof Activity;
  tone: Tone;
  /** §30 — the provenance of this specific figure, not the page's. */
  mode: DataMode;
}

/**
 * §D — the KPI strip.
 *
 * The previous build showed four hardcoded literals: 1,347 stations (the
 * registry holds 21), a 99.2% pass rate, zero active incidents, and a "<5ms
 * detection lag" for a number nothing in the codebase measured. It was also
 * painted `#0A0A0A`, which is the old near-black brand — the brief reserves
 * red for CRITICAL FAULT and asks for a navy/blue system.
 *
 * Every figure below is computed from `computeKpis(getNetworkSnapshot())`,
 * which is itself a function of the engine's output over the 21 registered
 * stations, so the strip cannot drift from the table behind it.
 */
export default function KpiStrip() {
  const snapshot = getNetworkSnapshot();
  const k = useMemo(() => computeKpis(snapshot), [snapshot]);

  const kpis: Kpi[] = [
    {
      label: 'Observatories online',
      value: `${k.nominal} / ${k.total}`,
      status: k.nominal === k.total ? 'All stations reporting' : 'Partial degradation',
      detail: `${k.total - k.nominal} station(s) not at WMO Flag 1`,
      Icon: Radio,
      tone: k.nominal === k.total ? 'healthy' : 'warning',
      mode: DATA_MODE,
    },
    {
      label: 'Data quality score',
      value: `${k.qualityScore.toFixed(1)}%`,
      status: k.qualityScore >= 95 ? 'Within target' : 'Below target',
      detail: 'Share of stations at WMO Flag 1',
      Icon: ShieldCheck,
      tone: k.qualityScore >= 95 ? 'healthy' : 'warning',
      mode: DATA_MODE,
    },
    {
      label: 'Active anomalies',
      value: String(k.activeAnomalies),
      status:
        k.activeAnomalies === 0
          ? 'No anomalies open'
          : `${k.weatherEvents} weather · ${k.drift} drift · ${k.faults} fault · ${k.telemetryIssues} telemetry`,
      detail: 'Stations above Flag 1 at the newest tick',
      Icon: Activity,
      tone: k.activeAnomalies === 0 ? 'healthy' : k.faults > 0 ? 'fault' : 'weather',
      mode: DATA_MODE,
    },
    {
      label: 'Engine pass time',
      value: `${snapshot.buildDurationMs.toFixed(1)} ms`,
      // Deliberately not called "latency". This times the QC pass, not a
      // station-to-console delivery, and no such measurement exists here.
      status: 'Measured, not a delivery SLA',
      detail: `${snapshot.stations.length} stations · ${snapshot.stations[0]?.historyDepth ?? 0} ticks`,
      Icon: Gauge,
      tone: 'telemetry',
      mode: DATA_MODE,
    },
  ];

  return (
    <section aria-label="Network key figures" className="card overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={clsx(
              'relative flex flex-col gap-1 px-4 py-3.5',
              i < kpis.length - 1 && 'border-b border-hairline sm:border-b-0 sm:border-r'
            )}
          >
            <div className="flex items-center gap-1.5">
              <kpi.Icon size={13} className={TONE_TEXT[kpi.tone]} aria-hidden />
              <span className="t-label">{kpi.label}</span>
            </div>
            <span
              className={clsx('t-mono text-[26px] leading-tight font-bold', TONE_TEXT[kpi.tone])}
              // The engine pass timing (`buildDurationMs`) is measured with
              // `performance.now()` and therefore differs between the SSR
              // prerender and the client hydration. The mismatch is real and
              // expected; the value the client sees is the correct one.
              suppressHydrationWarning
            >
              {kpi.value}
            </span>
            <span className="t-body text-[12.5px] text-ink-muted">{kpi.status}</span>
            <span className="t-meta">{kpi.detail}</span>
            {/* §30: every figure carries the mode it came from. */}
            <span className="t-label mt-1 inline-flex w-fit items-center gap-1 rounded border border-hairline px-1.5 py-0.5 text-ink-faint">
              {kpi.mode}
            </span>
            {kpi.tone === 'fault' && (
              <>
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: 'var(--color-fault)' }}
                  aria-hidden
                />
                <span
                  className="absolute inset-0 bg-fault/5"
                  aria-hidden
                />
              </>
            )}
          </div>
        ))}
      </div>

      {k.activeFaults > 0 && (
        <p className="flex items-center gap-2 border-t border-hairline bg-surface-alt px-4 py-2 t-body text-fault">
          <AlertTriangle size={14} aria-hidden />
          {k.activeFaults} station(s) report a hardware fault. Not weather — see the incident log.
        </p>
      )}
    </section>
  );
}
