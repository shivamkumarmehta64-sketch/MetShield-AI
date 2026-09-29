'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { Activity, AlertTriangle, ArrowRight, Gauge, Radio, ShieldCheck } from 'lucide-react';
import { computeKpis, getNetworkSnapshot, DATA_MODE, type NetworkKpis } from '@/lib/networkFeed';

type Tone = 'healthy' | 'warning' | 'weather' | 'fault' | 'telemetry' | 'neutral';

const TONE_TEXT: Record<Tone, string> = {
  healthy: 'text-healthy',
  warning: 'text-warning',
  weather: 'text-weather',
  fault: 'text-fault',
  telemetry: 'text-telemetry',
  neutral: 'text-ink',
};

/**
 * The dot under each figure. Colour alone is not a status channel (WCAG 1.4.1) —
 * the word beside it is the actual signal, this only makes it scannable.
 */
const TONE_DOT: Record<Tone, string> = {
  healthy: 'var(--color-healthy)',
  warning: 'var(--color-warning)',
  weather: 'var(--color-weather)',
  fault: 'var(--color-fault)',
  telemetry: 'var(--color-telemetry)',
  neutral: 'var(--color-ink-faint)',
};

interface Kpi {
  label: string;
  value: string;
  /** Stated in words, not implied by the colour. §E */
  status: string;
  detail: string;
  Icon: typeof Activity;
  tone: Tone;
}

export interface Verdict {
  tone: Tone;
  headline: string;
  detail: string;
  /** Station ids the operator has to act on, for the fault case. Empty otherwise. */
  faultStations: string[];
}

/**
 * The one line the console opens with.
 *
 * WHY THIS IS A SEPARATE EXPORTED FUNCTION
 * ---------------------------------------
 * The verdict is the load-bearing claim of the console — "is anything wrong,
 * and is it weather or hardware" — and the four branches it selects between are
 * exactly the branches that are invisible when you read the source: each one
 * only fires for a different combination of the engine's classifications. A
 * strip that only ever renders one of them can look correct while three are
 * broken. So the decision is factored out of JSX, where it is unobservable
 * without a DOM, and pinned in `__tests__/kpiVerdict.test.ts` against real
 * `runScenario()` output. Editing this function without a scenario that reaches
 * the branch you changed should fail that test.
 *
 * Fault outranks the rest: an unverified transducer is the one condition where
 * "needs attention" understates the action, and red is reserved for it.
 */
export function computeVerdict(k: NetworkKpis, faultStations: string[]): Verdict {
  if (k.activeFaults > 0) {
    return {
      tone: 'fault',
      headline: `${k.activeFaults} STATION${k.activeFaults === 1 ? '' : 'S'} REPORT HARDWARE FAULT`,
      detail: `${faultStations.join(' · ')} — transducer fault, not weather.`,
      faultStations,
    };
  }
  if (k.activeAnomalies === 0) {
    return {
      tone: 'healthy',
      headline: 'NETWORK NOMINAL',
      detail: `All ${k.total} registered stations at WMO Flag 1.`,
      faultStations: [],
    };
  }
  // Only the non-zero classes are named — a line reading "0 storm · 1 drift"
  // makes the operator re-parse the zeros to find the signal.
  const parts: string[] = [];
  if (k.weatherEvents > 0) parts.push(`${k.weatherEvents} convective storm`);
  if (k.drift > 0) parts.push(`${k.drift} sensor drift`);
  if (k.telemetryIssues > 0) parts.push(`${k.telemetryIssues} packet loss`);
  return {
    tone: 'warning',
    headline: `${k.activeAnomalies} STATION${k.activeAnomalies === 1 ? '' : 'S'} NEED ATTENTION`,
    detail: `${parts.join(' · ')}.`,
    faultStations: [],
  };
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
 *
 * The strip leads with a verdict rather than with four equal figures. An
 * operator opening the console at 2 AM needs "is anything wrong" before they
 * need the exact quality yield, and four same-weight numbers make them read all
 * four to answer the first question. The figures stay; they move below the
 * answer. Per Grafana's dashboard guidance, the panel should answer the question
 * it is on the page to answer.
 */
export default function KpiStrip() {
  const snapshot = getNetworkSnapshot();
  const k = useMemo(() => computeKpis(snapshot), [snapshot]);

  const kpis: Kpi[] = [
    {
      label: 'AWS Stations',
      value: `${k.nominal} / ${k.total}`,
      status: k.nominal === k.total ? 'All reporting' : `${k.total - k.nominal} flagged`,
      detail: `${k.nominal} nominal of ${k.total}`,
      Icon: Radio,
      tone: k.nominal === k.total ? 'healthy' : 'warning',
    },
    {
      label: 'Quality Yield',
      value: `${k.qualityScore.toFixed(1)}%`,
      status: k.qualityScore >= 95 ? 'Target met' : 'Below target',
      detail: 'WMO Flag 1 yield',
      Icon: ShieldCheck,
      tone: k.qualityScore >= 95 ? 'healthy' : 'warning',
    },
    {
      label: 'Active Anomalies',
      value: String(k.activeAnomalies),
      status:
        k.activeAnomalies === 0
          ? '0 active'
          : `${k.weatherEvents} storm · ${k.drift} drift · ${k.faults} fault`,
      detail: 'Non-nominal detections',
      Icon: Activity,
      tone: k.activeAnomalies === 0 ? 'healthy' : k.faults > 0 ? 'fault' : 'weather',
    },
    {
      label: 'Engine Time',
      value: `${snapshot.buildDurationMs.toFixed(1)} ms`,
      status: 'Deterministic QC pass',
      detail: `${snapshot.stations.length} stations · ${snapshot.stations[0]?.historyDepth ?? 0} ticks`,
      Icon: Gauge,
      tone: 'telemetry',
    },
  ];

  const verdict = computeVerdict(
    k,
    snapshot.stations.filter((s) => s.health === 'FAULT').map((s) => s.stationId)
  );
  const VerdictIcon = verdict.tone === 'healthy' ? ShieldCheck : AlertTriangle;

  return (
    <section aria-label="Network key figures" className="card overflow-hidden">
      {/* Verdict band — one answer, above the figures that produce it. */}
      <div
        className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-hairline bg-surface-alt px-5 py-3"
        role="status"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <VerdictIcon size={15} className={TONE_TEXT[verdict.tone]} aria-hidden />
            <span className="t-label text-ink-muted">NETWORK STATUS</span>
          </div>
          <div className={clsx('t-section-title mt-1', TONE_TEXT[verdict.tone])}>{verdict.headline}</div>
          <p className="t-body mt-0.5 text-ink-muted">{verdict.detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {k.activeFaults > 0 && (
            <Link href="/incidents" className="t-label text-fault-text inline-flex items-center gap-1 hover:underline">
              Incident log <ArrowRight size={12} aria-hidden />
            </Link>
          )}
          {/* §30 — provenance, stated once for the whole strip rather than once
              per tile. Four identical chips is three more places for the badge
              to go stale than the one line that governs all four figures. */}
          <span className="t-label font-mono rounded border border-hairline bg-card px-2 py-1 text-ink-muted">
            {DATA_MODE}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={clsx(
              'relative flex flex-col gap-1 px-5 py-4',
              i < kpis.length - 1 && 'border-b border-hairline sm:border-b-0 sm:border-r'
            )}
          >
            <div className="flex items-center gap-1.5">
              <kpi.Icon size={14} className={TONE_TEXT[kpi.tone]} aria-hidden />
              <span className="t-label text-ink-muted">{kpi.label}</span>
            </div>
            {/* The value is deliberately NOT tinted. A healthy 96% and a failing
                91% were the same volume of colour; tinting made magnitude look
                like status. Status is the dot and the word underneath. */}
            <span className="t-mono text-[26px] leading-tight font-bold text-ink my-0.5" suppressHydrationWarning>
              {kpi.value}
            </span>
            <div className="flex items-center gap-1.5 text-[12.5px]">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: TONE_DOT[kpi.tone] }}
                aria-hidden
              />
              <span className="font-medium text-ink">{kpi.status}</span>
            </div>
            <span className="t-meta text-[11.5px] text-ink-muted">{kpi.detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
