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
      label: 'AWS Stations',
      value: `${k.nominal} / ${k.total}`,
      status: k.nominal === k.total ? 'All reporting' : `${k.total - k.nominal} flagged`,
      detail: `${k.nominal} nominal of ${k.total}`,
      Icon: Radio,
      tone: k.nominal === k.total ? 'healthy' : 'warning',
      mode: DATA_MODE,
    },
    {
      label: 'Quality Yield',
      value: `${k.qualityScore.toFixed(1)}%`,
      status: k.qualityScore >= 95 ? 'Target met' : 'Below target',
      detail: 'WMO Flag 1 yield',
      Icon: ShieldCheck,
      tone: k.qualityScore >= 95 ? 'healthy' : 'warning',
      mode: DATA_MODE,
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
      mode: DATA_MODE,
    },
    {
      label: 'Engine Time',
      value: `${snapshot.buildDurationMs.toFixed(1)} ms`,
      status: 'Deterministic QC pass',
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
              'relative flex flex-col gap-1 px-5 py-4',
              i < kpis.length - 1 && 'border-b border-hairline sm:border-b-0 sm:border-r'
            )}
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <kpi.Icon size={14} className={TONE_TEXT[kpi.tone]} aria-hidden />
                <span className="t-label text-ink-muted">{kpi.label}</span>
              </div>
              <span className="t-label font-mono px-1.5 py-0.5 rounded border border-hairline bg-surface-alt text-ink-faint text-[10px]">
                {kpi.mode}
              </span>
            </div>
            <span
              className={clsx('t-mono text-[28px] leading-tight font-bold my-0.5', TONE_TEXT[kpi.tone])}
              suppressHydrationWarning
            >
              {kpi.value}
            </span>
            <div className="flex items-center gap-1.5 text-[12.5px]">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    kpi.tone === 'healthy'
                      ? 'var(--color-healthy)'
                      : kpi.tone === 'fault'
                        ? 'var(--color-fault)'
                        : kpi.tone === 'weather'
                          ? 'var(--color-weather)'
                          : kpi.tone === 'warning'
                            ? 'var(--color-warning)'
                            : 'var(--color-telemetry)',
                }}
                aria-hidden
              />
              <span className="font-medium text-ink">{kpi.status}</span>
            </div>
            <span className="t-meta text-[11.5px] text-ink-muted">{kpi.detail}</span>
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
        <p className="flex items-center gap-2 border-t border-hairline bg-surface-alt px-4 py-2 t-body text-fault-text">
          <AlertTriangle size={14} className="text-fault-text" aria-hidden />
          {k.activeFaults} station(s) report a hardware fault. Not weather — see the incident log.
        </p>
      )}
    </section>
  );
}
