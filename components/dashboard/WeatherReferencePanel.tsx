'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import {
  crossCheck,
  STATUS_LABEL,
  type AgreementStatus,
  type ReferenceReading,
  type StationReading,
} from '@/lib/weatherReference';

/**
 * EXTERNAL WEATHER REFERENCE — an independent second opinion, deliberately
 * subordinate to the QC decision above it.
 * ---------------------------------------------------------------------------
 * The visual hierarchy is the product claim. This panel sits below the engine's
 * verdict in a muted frame and is never the largest thing on screen, because
 * it is the least authoritative: Open-Meteo is a gridded numerical model, this
 * AWS side is BENCHMARK, and neither number is ground truth for the other. A
 * panel that visually outranked the QC decision would be lying with layout.
 *
 * It is also strictly downstream. Nothing here writes back — no flag, no work
 * order, no change to `evaluate()`. If this panel is never opened, or the
 * fetch fails, the console is byte-for-byte the product it was before. That is
 * why it is collapsed by default and fetches on demand: it costs nothing until
 * an operator asks for it.
 *
 * Load-bearing honesty rules, each of which has a test in
 * __tests__/weatherReference.test.ts:
 *   - A missing value renders N/A, never 0, blank, or the station's own value.
 *   - A non-MSL reference pressure is labelled and never differenced.
 *   - A failed fetch yields no deltas at all, not deltas against a fallback.
 */

type FetchState = 'IDLE' | 'LOADING' | 'OK' | 'FAILED';

interface PanelProps {
  stationId: string;
  stationName: string;
  lat: number;
  lon: number;
  station: StationReading | null;
}

const STATUS_COLOR: Record<AgreementStatus, string> = {
  CLOSE_AGREEMENT: 'var(--color-healthy-text)',
  MODERATE_DISAGREEMENT: 'var(--color-warning-text)',
  STRONG_DISAGREEMENT: 'var(--color-fault-text)',
  REFERENCE_UNAVAILABLE: 'var(--ink-muted)',
};

const STATUS_BG: Record<AgreementStatus, string> = {
  CLOSE_AGREEMENT: 'var(--color-healthy-bg)',
  MODERATE_DISAGREEMENT: 'var(--color-warning-bg)',
  STRONG_DISAGREEMENT: 'var(--color-fault-bg)',
  REFERENCE_UNAVAILABLE: 'var(--surface-alt)',
};

/**
 * N/A, never a substituted number. Always one decimal.
 *
 * The station side arrives raw from the packet register (it prints
 * 57.29764348725831 unformatted) while the reference side was already rounded
 * by the route — so the two columns of the same table render at different
 * precisions. Rounding here is presentation only: the delta is computed from
 * the unrounded pair upstream.
 */
function val(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return 'N/A';
  return `${Math.round(v * 10) / 10}`;
}

// The UNIT column already carries the unit; repeating it in every delta cell
// is noise. Only the sign belongs here.
function signed(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return 'N/A';
  const r = Math.round(v * 10) / 10;
  return r > 0 ? `+${r}` : `${r}`;
}

function fmtObserved(iso: string | null): string {
  if (!iso) return 'N/A';
  const parsed = Date.parse(`${iso}+05:30`);
  if (Number.isNaN(parsed)) return 'N/A';
  return new Date(parsed).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }) + ' IST';
}

export default function WeatherReferencePanel({ stationId, stationName, lat, lon, station }: PanelProps) {
  const [state, setState] = useState<FetchState>('IDLE');
  const [reference, setReference] = useState<ReferenceReading | null>(null);
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setState('LOADING');
    setError(null);

    try {
      const url =
        `/api/weather/reference?stationId=${encodeURIComponent(stationId)}` +
        `&lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`;
      const res = await fetch(url, { signal: controller.signal });
      const json = await res.json();

      if (!json?.success) {
        // A non-2xx carries a status word; show it rather than a generic
        // "something went wrong".
        setError(json?.message ?? 'Reference unavailable');
        setReference(null);
        setState('FAILED');
        return;
      }

      const d = json.data as ReferenceReading;
      setReference(d);
      setObservedAt(d.observedAt);
      setStale(json.status === 'STALE');
      setState('OK');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return; // superseded
      setError('Reference unavailable');
      setReference(null);
      setState('FAILED');
    }
  }, [stationId, lat, lon]);

  // Abort in flight on unmount. Without this, switching stations quickly
  // races two responses and the panel can render one station's reference
  // under another's name.
  //
  // There is deliberately no "reset on stationId change" effect: the parent
  // passes key={stationId}, so changing station remounts this component with
  // clean state. An effect that cleared state on a prop change is the
  // cascading-render pattern `react-hooks/set-state-in-effect` exists to
  // block, and a remount is both cheaper and race-free.
  useEffect(() => {
    return () => abort.current?.abort();
  }, []);

  const result = crossCheck(station, reference);

  return (
    <section
      aria-labelledby="wxref-h"
      style={{
        border: '1px solid var(--hairline)',
        borderRadius: 6,
        background: 'var(--surface-alt)',
        opacity: 0.96,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderBottom: state === 'IDLE' ? 'none' : '1px solid var(--hairline)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            id="wxref-h"
            className="t-label"
            style={{ color: 'var(--ink-muted)', fontWeight: 700 }}
          >
            INDEPENDENT WEATHER REFERENCE
          </h2>
          <p className="t-meta" style={{ fontSize: 10.5, marginTop: 2 }}>
            Advisory cross-check · advisory only — the QC decision above is unchanged
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {state === 'OK' && (
            <button
              type="button"
              onClick={load}
              className="t-label"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 7px', border: '1px solid var(--hairline)',
                borderRadius: 4, background: 'var(--card)', cursor: 'pointer',
                color: 'var(--ink-muted)',
              }}
              aria-label="Refresh external weather reference"
            >
              <RefreshCw size={11} aria-hidden />
              <span>REFRESH</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const next = !open;
              setOpen(next);
              if (next && state === 'IDLE') void load();
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', border: '1px solid var(--hairline)',
              borderRadius: 4, background: 'var(--card)', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, color: 'var(--color-telemetry-text)',
            }}
            aria-expanded={open}
          >
            <ExternalLink size={11} aria-hidden />
            <span>{open ? 'HIDE' : 'COMPARE'}</span>
          </button>
        </div>
      </header>

      {!open && null}

      {open && (
        <div style={{ padding: '10px 10px 12px' }}>
          {/* ── Loading / idle ─────────────────────────────────────────── */}
          {state === 'IDLE' && (
            <p className="t-meta" style={{ fontSize: 11.5 }}>
              Collapsed by default. Fetching a model reading costs an outbound request, so
              it happens only when an operator asks for it.
            </p>
          )}

          {state === 'LOADING' && (
            <p className="t-meta" style={{ fontSize: 11.5 }}>Contacting reference provider…</p>
          )}

          {/* ── Failure. No deltas, and it says the decision still stands. ── */}
          {state === 'FAILED' && (
            <div>
              <div
                className="t-label"
                style={{
                  display: 'inline-block', padding: '2px 7px', borderRadius: 3,
                  background: STATUS_BG.REFERENCE_UNAVAILABLE,
                  border: '1px solid var(--hairline)',
                  color: STATUS_COLOR.REFERENCE_UNAVAILABLE, fontWeight: 700,
                }}
              >
                {STATUS_LABEL.REFERENCE_UNAVAILABLE}
              </div>
              <p className="t-meta" style={{ fontSize: 11.5, marginTop: 7 }}>
                {error ?? 'The external provider did not return a usable reading.'} No comparison
                was made — no value has been substituted for the missing one.
              </p>
              <p className="t-meta" style={{ fontSize: 11.5, marginTop: 5 }}>
                {result.interpretation}
              </p>
              <button
                type="button"
                onClick={load}
                className="t-label"
                style={{
                  marginTop: 8, padding: '3px 8px', border: '1px solid var(--hairline)',
                  borderRadius: 4, background: 'var(--card)', cursor: 'pointer',
                  color: 'var(--ink-muted)',
                }}
              >
                TRY AGAIN
              </button>
            </div>
          )}

          {/* ── Success ────────────────────────────────────────────────── */}
          {state === 'OK' && reference && (
            <div>
              <div
                className="flex flex-wrap items-center gap-2"
                style={{ marginBottom: 8 }}
              >
                <span
                  className="t-label"
                  style={{
                    padding: '2px 7px', borderRadius: 3,
                    background: STATUS_BG[result.status],
                    border: '1px solid var(--hairline)',
                    color: STATUS_COLOR[result.status], fontWeight: 700,
                  }}
                >
                  {STATUS_LABEL[result.status]}
                </span>
                {stale && (
                  <span
                    className="t-label"
                    style={{
                      padding: '2px 6px', borderRadius: 3,
                      background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)',
                      border: '1px solid var(--hairline)', fontWeight: 700,
                    }}
                  >
                    STALE &gt; 1H
                  </span>
                )}
                <span className="t-meta" style={{ fontSize: 10.5, marginLeft: 'auto' }}>
                  {stationName} · updated {fmtObserved(observedAt)}
                </span>
              </div>

              {/* Channel table. AWS on the left is BENCHMARK, so it is labelled
                  as such here — not called "live". */}
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}
              >
                <caption className="sr-only">
                  External weather reference compared with the station observation for{' '}
                  {stationName}. The station column is benchmark data, not a live
                  measurement.
                </caption>
                <thead>
                  <tr>
                    {['CHANNEL', 'STATION (BENCHMARK)', 'EXTERNAL REFERENCE', 'DELTA', 'UNIT'].map(
                      (h) => (
                        <th
                          key={h}
                          scope="col"
                          className="t-label"
                          style={{
                            textAlign: 'left', fontWeight: 700, fontSize: 9.5,
                            color: 'var(--ink-muted)', padding: '3px 6px 3px 0',
                            borderBottom: '1px solid var(--hairline)',
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.comparisons.map((c) => (
                    <tr key={c.channel} style={{ borderBottom: '1px solid var(--hairline)' }}>
                      <td
                        style={{ padding: '4px 6px 4px 0', fontWeight: 600, color: 'var(--ink)' }}
                      >
                        {c.channel}
                      </td>
                      <td className="t-mono" style={{ padding: '4px 6px 4px 0' }}>
                        {val(c.station)}
                      </td>
                      <td className="t-mono" style={{ padding: '4px 6px 4px 0' }}>
                        {val(c.reference)}
                      </td>
                      <td
                        className="t-mono"
                        style={{
                          padding: '4px 6px 4px 0',
                          fontWeight: 600,
                          // A delta that exists but is not comparable is drawn
                          // N/A, never a number a reader could mistake for one.
                          color: c.comparable ? 'var(--ink)' : 'var(--ink-muted)',
                        }}
                      >
                        {c.comparable ? signed(c.delta) : 'N/A'}
                      </td>
                      <td
                        className="t-meta"
                        style={{ padding: '4px 0', fontSize: 10, color: 'var(--ink-muted)' }}
                      >
                        {c.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pressure datum. Stated every time, not only when it goes
                  wrong — a reader should never have to guess which one this is. */}
              <p
                className="t-meta"
                style={{ fontSize: 10.5, marginTop: 7, color: 'var(--ink-muted)' }}
              >
                Reference pressure datum: <strong>{result.pressureLabel}</strong>
                {result.status !== 'REFERENCE_UNAVAILABLE' &&
                  result.comparisons.find((c) => c.channel === 'Pressure')?.reason && (
                    <>
                      {' '}
                      — {result.comparisons.find((c) => c.channel === 'Pressure')?.reason}
                    </>
                  )}
              </p>

              <p
                style={{
                  marginTop: 8, paddingTop: 8, fontSize: 11.5, lineHeight: 1.5,
                  color: 'var(--ink-muted)',
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                <strong style={{ color: 'var(--ink)' }}>INTERPRETATION. </strong>
                {result.interpretation}
              </p>

              <p className="t-meta" style={{ fontSize: 10, marginTop: 7 }}>
                Source: Open-Meteo (independent NWP model reading) · not a station
                measurement · not used by the QC engine · no ground truth is claimed.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
