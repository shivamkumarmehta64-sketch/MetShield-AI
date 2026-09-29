'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  getNetworkSnapshot,
  computeKpis,
  classificationLabel,
  type StationSnapshot,
} from '@/lib/networkFeed';
import type { StationHealth } from '@/lib/networkFeed';
import { formatIST, nicWmoEngineInstance } from '@/lib/anomalyLogic';

/**
 * The operations band — the landing page's centre of gravity.
 *
 * WHY THIS READS THE ENGINE DIRECTLY
 * ---------------------------------
 * This is not a picture of the dashboard and it is not a mock of it. It calls
 * the same `getNetworkSnapshot()` that `app/dashboard/page.tsx` calls, so the
 * station states, flags, and the "newest packet" timestamp on this page are
 * the engine's output, not a hand-written approximation of it. If the engine
 * changes, this page changes with it and cannot disagree with the console.
 *
 * WHY IT IS NOT A SECOND DASHBOARD
 * --------------------------------
 * A landing page that tries to be the product is a landing page that has to be
 * maintained twice. This is a fixed viewport-height panel that answers one
 * question — "what does this system actually think right now?" — with the
 * highest-signal rows only, and hands the rest of the work to /dashboard. It
 * shows the stations that are NOT nominal, because those are the reason the
 * page exists; a wall of 21 green rows is not information.
 *
 * The panel does not poll. The snapshot is memoised in lib/networkFeed.ts and
 * the scenario switcher that changes it lives in the console.
 */

const HEALTH_TEXT: Record<StationHealth, string> = {
  NOMINAL: 'var(--color-healthy-text)',
  DRIFT: 'var(--color-warning-text)',
  WEATHER_EVENT: 'var(--color-weather)',
  FAULT: 'var(--color-fault-text)',
  TELEMETRY: 'var(--color-fault-text)',
};

const HEALTH_WORD: Record<StationHealth, string> = {
  NOMINAL: 'nominal',
  DRIFT: 'drift',
  WEATHER_EVENT: 'weather event',
  FAULT: 'fault',
  TELEMETRY: 'packet loss',
};

/**
 * Build an SVG path for one channel over the panel's time window.
 *
 * @param values oldest-to-newest, exactly the points that exist
 * @param zero   draw a zero reference line when the series crosses it
 */
function tracePath(values: number[], width: number, height: number): string {
  if (values.length < 2) return '';
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.15 || 1;
  const min = lo - pad;
  const span = hi - lo + pad * 2 || 1;
  const step = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${Math.max(0, Math.min(height, y)).toFixed(1)}`;
    })
    .join(' ');
}

const TRACE_W = 300;
const TRACE_H = 36;

function RateOfChangeTrace({ station }: { station: StationSnapshot }) {
  /**
   * The engine's own per-station packet buffer, read through the public
   * `getBuffer` accessor. This is the real record of what the station
   * reported, tick by tick — the same array the drift and freeze rules
   * threshold against. It is not a reconstruction, and it is not padded:
   * however many packets exist is how many are plotted.
   */
  const series = nicWmoEngineInstance.getBuffer(station.stationId);
  const recent = series.slice(-24);

  const points = recent.map((p) => p.ratesOfChange.pressRoC);
  const crossesZero = points.some((v) => v < 0) && points.some((v) => v >= 0);

  if (points.length < 2) {
    return (
      <p className="t-meta">
        The engine buffer holds {points.length} packet{points.length === 1 ? '' : 's'} for {station.stationId} — one
        point cannot show a rate of change.
      </p>
    );
  }

  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const pad = (hi - lo) * 0.15 || 1;
  const zeroY = TRACE_H - ((0 - (lo - pad)) / (hi - lo + pad * 2)) * TRACE_H;
  const path = tracePath(points, TRACE_W, TRACE_H);
  const newest = points[points.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${TRACE_W} ${TRACE_H}`}
        preserveAspectRatio="none"
        style={{ height: TRACE_H, display: 'block', width: '100%' }}
        role="img"
        aria-label={`Pressure rate of change over the last ${points.length} engine packets for ${station.stationId}. Currently ${newest} hectopascals per tick, range ${lo} to ${hi}.`}
      >
        {crossesZero && (
          <line
            x1="0"
            y1={Math.max(0, Math.min(TRACE_H, zeroY))}
            x2={TRACE_W}
            y2={Math.max(0, Math.min(TRACE_H, zeroY))}
            stroke="var(--color-hairline-strong)"
            strokeWidth="1"
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path d={path} fill="none" stroke="var(--color-met-pressure)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="t-meta" style={{ marginTop: 3 }}>
        Pressure rate of change, last {points.length} engine packet{points.length === 1 ? '' : 's'} · now {newest} hPa/tick
        {station.resolved ? ' · station has since returned to nominal' : ''}
      </p>
    </div>
  );
}

function ReadingCell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ borderLeft: '1px solid var(--hairline)', paddingLeft: 10 }}>
      <div className="t-label">{label}</div>
      <div className="t-mono" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2, marginTop: 3 }}>
        {value}
        <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--ink-muted)', marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  );
}

export default function OperationsBand() {
  const snapshot = getNetworkSnapshot();
  const kpis = useMemo(() => computeKpis(snapshot), [snapshot]);

  /**
   * The station the panel leads with. It prefers a station the engine has
   * actually faulted, because the point of the panel is to show the decision
   * working. It falls back to the first nominal station so the panel is never
   * empty, and a nominal station is a perfectly good answer — it shows the
   * ACCEPTED path of the pipeline.
   */
  const lead = useMemo(() => {
    const faulted = snapshot.stations.find((s) => s.health === 'FAULT')
      ?? snapshot.stations.find((s) => s.health !== 'NOMINAL');
    return faulted ?? snapshot.stations[0];
  }, [snapshot]);

  const attention = useMemo(
    () => snapshot.stations.filter((s) => s.health !== 'NOMINAL'),
    [snapshot]
  );

  const packet = lead.packet;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* ── Panel header ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-2"
        style={{ borderBottom: '1px solid var(--hairline)', padding: '9px 14px', background: 'var(--surface-alt)' }}
      >
        <div className="flex items-baseline gap-2.5">
          <span className="t-label" style={{ color: 'var(--ink)' }}>Network quality</span>
          <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
            {snapshot.stations.length} stations · newest packet {formatIST(snapshot.latestTimestamp)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
            <span style={{ color: 'var(--color-healthy-text)', fontWeight: 600 }}>{kpis.nominal}</span> nominal
            {' · '}
            <span style={{ color: 'var(--color-warning-text)', fontWeight: 600 }}>{kpis.drift + kpis.telemetryIssues}</span> watch
            {' · '}
            <span style={{ color: 'var(--color-fault-text)', fontWeight: 600 }}>{kpis.faults}</span> fault
          </span>
          <span
            className="t-label"
            style={{
              border: '1px solid var(--color-hairline-strong)',
              borderRadius: 3,
              padding: '2px 6px',
              color: 'var(--ink)',
            }}
          >
            {snapshot.dataMode}
          </span>
        </div>
      </div>

      {/* ── Lead station: the engine's current decision ── */}
      <div style={{ borderBottom: '1px solid var(--hairline)', padding: '14px 14px 12px' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex items-baseline gap-2.5">
            <span className="t-mono" style={{ fontSize: 14, fontWeight: 700 }}>{lead.stationId}</span>
            <span className="t-body" style={{ color: 'var(--ink-muted)' }}>{lead.name}</span>
          </div>
          <span
            className="t-mono"
            style={{ fontSize: 11, fontWeight: 600, color: HEALTH_TEXT[lead.health], letterSpacing: '0.06em' }}
          >
            {lead.wmoFlag}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ marginTop: 12, rowGap: 12 }}>
          <ReadingCell label="Temperature" value={packet.raw.temperature?.toFixed(1) ?? '—'} unit="°C" />
          <ReadingCell label="Pressure" value={packet.raw.pressure?.toFixed(1) ?? '—'} unit="hPa" />
          <ReadingCell label="Humidity" value={packet.raw.humidity?.toFixed(0) ?? '—'} unit="% RH" />
          <div style={{ borderLeft: '1px solid var(--hairline)', paddingLeft: 10 }}>
            <div className="t-label">Decision</div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25, marginTop: 3, color: HEALTH_TEXT[lead.health] }}>
              {classificationLabel(lead.classification)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <RateOfChangeTrace station={lead} />
        </div>

        <p className="t-body" style={{ marginTop: 10, color: 'var(--ink-muted)', maxWidth: '72ch' }}>
          {lead.resolved ? (
            <>
              The newest observation is back to nominal. The verdict below is retained from the last flagged packet, so
              the record of what happened is not overwritten by recovery.
            </>
          ) : (
            lead.packet.operationalAction
          )}
        </p>
      </div>

      {/* ── Stations needing attention ── */}
      <div style={{ borderBottom: '1px solid var(--hairline)' }}>
        <div className="flex items-baseline justify-between" style={{ padding: '10px 14px 8px' }}>
          <h3 className="t-card-title">Active Anomalies</h3>
          <span className="t-meta t-mono">{attention.length} of {snapshot.stations.length}</span>
        </div>

        {attention.length === 0 ? (
          <p className="t-body" style={{ padding: '0 14px 14px', color: 'var(--ink-muted)' }}>
            Every station in this snapshot is at FLAG_1. That is what a healthy network looks like — it is not a
            demo of the failure path, so use the testbench at <Link href="/dashboard?tab=testbench" className="underline" style={{ color: 'var(--color-telemetry-text)' }}>/dashboard?tab=testbench</Link> to inject a fault.
          </p>
        ) : (
          <ul>
            {attention.map((s) => (
              <li
                key={s.stationId}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                style={{ borderTop: '1px solid var(--hairline)', padding: '7px 14px' }}
              >
                <span className="t-mono" style={{ fontSize: 12, fontWeight: 600, minWidth: 96 }}>{s.stationId}</span>
                <span className="t-body" style={{ color: 'var(--ink-muted)', flex: '1 1 180px' }}>{s.name}</span>
                <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                  {s.packet.ratesOfChange.pressRoC} hPa · {s.packet.ratesOfChange.humRoC} % RH
                </span>
                <span
                  className="t-mono"
                  style={{ fontSize: 11, fontWeight: 600, color: HEALTH_TEXT[s.health], letterSpacing: '0.05em' }}
                >
                  {HEALTH_WORD[s.health]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Hand-off ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" style={{ padding: '11px 14px', background: 'var(--surface-alt)' }}>
        <Link
          href="/dashboard"
          className="t-label"
          style={{ color: 'var(--accent-fg)', background: 'var(--brand)', padding: '6px 12px', borderRadius: 4, textDecoration: 'none' }}
        >
          Open the console
        </Link>
        <span className="t-meta">
          Full matrix, QC panel, scenario testbench and the national map are at <Link href="/dashboard" style={{ color: 'var(--color-telemetry-text)' }}>/dashboard</Link>.
        </span>
      </div>
    </div>
  );
}
