'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Play, CheckCircle2, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { runScenario, SCENARIOS, type ScenarioId } from '@/lib/networkFeed';
import DataModeBadge from './DataModeBadge';
import WmoFlagBadge from './WmoFlagBadge';

/**
 * §M — the testbench.
 *
 * The rule this enforces: the testbench drives the SAME engine and renders the
 * SAME components as normal operation. The previous build shipped a
 * `StormVsFaultSimulator` that displayed a hardcoded array of four scenarios
 * with fabricated confidence values, and an `AIEnginePipeline` that headlined a
 * "97.8% F1 score" for a model that does not exist. Both were deleted; this
 * panel replaces them with the real thing.
 */
export default function Testbench() {
  const [scenario, setScenario] = useState<ScenarioId>('normal');
  const [runIndex, setRunIndex] = useState(0);

  const active = SCENARIOS.find((s) => s.id === scenario) ?? SCENARIOS[0];

  // The engine's generator is genuinely random between calls even under its
  // deterministic flag, so `runIndex` is a real dependency: it is passed to the
  // engine as an epoch shift, which is the same thing the wall clock does
  // between two real observations. Bumping it is what makes Re-run produce a
  // different sample rather than a re-render.
  const runs = useMemo(() => runScenario(scenario, 40, runIndex), [scenario, runIndex]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
      <section className="card overflow-hidden" aria-label="Scenarios">
        <div className="border-b border-hairline px-4 py-3 flex items-center justify-between gap-2">
          <h2 className="t-card-title">Scenarios</h2>
          <DataModeBadge mode="REPLAY" />
        </div>
        <ul>
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setScenario(s.id)}
                aria-current={s.id === active.id ? 'true' : undefined}
                className={clsx(
                  'w-full text-left px-4 py-3 border-b border-hairline last:border-b-0',
                  s.id === active.id ? 'bg-surface-alt' : 'hover:bg-surface-hover'
                )}
              >
                <span className="t-card-title block">{s.label}</span>
                <span className="t-meta">{s.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-5 min-w-0">
        <section className="card p-5" aria-label="Scenario result">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="t-section-title text-navy">{active.label}</h2>
              <p className="t-body text-ink-muted">{active.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setRunIndex((i) => i + 1)}
              className="touch-target inline-flex items-center gap-2 rounded border border-hairline-strong bg-card px-3 text-[13px] font-semibold text-navy hover:bg-surface-alt"
            >
              <Play size={14} aria-hidden />
              Re-run
            </button>
          </div>

          <div className="mt-4 border-t border-hairline pt-3">
            <span className="t-label">Expected outcome</span>
            <p className="t-body">{active.expectation}</p>
          </div>
        </section>

        {runs.map((run) => {
          const flagged = run.packets.filter((p) => p.classification !== 'NOMINAL_OPERATION');
          const first = flagged[0];
          const last = run.packets[run.packets.length - 1];
          const detected = flagged.length > 0;
          const chart = run.packets.map((p, i) => ({
            i,
            pressure: p.raw.pressure,
            humidity: p.raw.humidity,
            temperature: p.raw.temperature,
            flagged: p.classification !== 'NOMINAL_OPERATION',
          }));

          return (
            <section key={run.stationId} className="card p-5" aria-label={`${run.stationId} result`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="t-section-title">
                    <span className="t-mono">{run.stationId}</span>{' '}
                    <span className="text-ink-muted font-normal">{run.stationName}</span>
                  </h3>
                  <p className="t-meta">
                    {run.packets.length} ticks replayed · fault injected at tick {run.triggerTick}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {first ? (
                    <WmoFlagBadge flag={first.wmoFlag} />
                  ) : (
                    <span className="t-label text-ink-muted">No flag raised</span>
                  )}
                </div>
              </div>

              {/* §H: state the result plainly rather than letting the chart imply it */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {detected ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-healthy">
                    <CheckCircle2 size={15} aria-hidden />
                    {first!.classification.replace(/_/g, ' ')} detected on {flagged.length} of{' '}
                    {run.packets.length} ticks
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
                    <XCircle size={15} aria-hidden />
                    No anomaly raised — all ticks nominal
                  </span>
                )}
                {detected && (
                  <span className="t-meta">
                    {last.classification === 'NOMINAL_OPERATION'
                      ? `· recovered to Flag 1 by the end of the run`
                      : `· still active at end of run`}
                  </span>
                )}
              </div>

              <div className="mt-4" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="3 3" />
                    <XAxis dataKey="i" tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
                    <YAxis
                      yAxisId="p"
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                    />
                    <YAxis yAxisId="h" orientation="right" domain={[0, 100]} hide />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        border: '1px solid var(--color-hairline)',
                        borderRadius: 6,
                        background: 'var(--color-card)',
                      }}
                      labelFormatter={(v) => `Tick ${v}`}
                    />
                    <ReferenceLine
                      x={run.triggerTick}
                      stroke="var(--color-ink-faint)"
                      strokeDasharray="4 4"
                      label={{ value: 'inject', position: 'top', fontSize: 10, fill: 'var(--color-ink-faint)' }}
                    />
                    <Line
                      yAxisId="p"
                      type="monotone"
                      dataKey="pressure"
                      name="Pressure (hPa)"
                      stroke="var(--color-met-pressure)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="h"
                      type="monotone"
                      dataKey="humidity"
                      name="Humidity (%)"
                      stroke="var(--color-met-humidity)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
