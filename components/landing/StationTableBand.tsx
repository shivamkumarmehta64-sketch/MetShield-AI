'use client';

import Link from 'next/link';
import { getNetworkSnapshot, classificationLabel, type StationSnapshot } from '@/lib/networkFeed';
import type { StationHealth } from '@/lib/networkFeed';
import { formatIST } from '@/lib/anomalyLogic';

/**
 * The 21 station profiles, as a registry table.
 *
 * A table, not a card grid. Twenty-one cards would be twenty-one rounded
 * rectangles of identical weight, which is the layout pattern this redesign
 * exists to remove — a card grid says "here are some features", a table says
 * "here is a registry, and you can compare rows".
 *
 * Every column is a real field. Temperature, pressure and humidity are the
 * newest packet's raw values; the QC status is the engine's health; the last
 * update is that packet's own IST stamp, not a page-load time.
 */

const HEALTH_TEXT: Record<StationHealth, string> = {
  NOMINAL: 'var(--color-healthy-text)',
  DRIFT: 'var(--color-warning-text)',
  WEATHER_EVENT: 'var(--color-weather)',
  FAULT: 'var(--color-fault-text)',
  TELEMETRY: 'var(--color-fault-text)',
};

const HEAD = 'text-left t-label';
const NUM = 'text-right t-mono';

function Cells({ station: s }: { station: StationSnapshot }) {
  const p = s.packet;
  return (
    <>
      <td className="t-mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.stationId}</td>
      <td style={{ minWidth: 200 }}>
        <div className="t-body">{s.name}</div>
        <div className="t-meta">{s.state} · {s.elevationM} m</div>
      </td>
      <td className={NUM}>{p.raw.temperature === null ? '—' : p.raw.temperature.toFixed(1)}</td>
      <td className={NUM}>{p.raw.pressure === null ? '—' : p.raw.pressure.toFixed(1)}</td>
      <td className={NUM}>{p.raw.humidity === null ? '—' : p.raw.humidity.toFixed(0)}</td>
      <td>
        <span className="t-mono" style={{ fontSize: 11, fontWeight: 600, color: HEALTH_TEXT[s.health], letterSpacing: '0.05em' }}>
          {s.wmoFlag.replace('FLAG_', '')}
        </span>
      </td>
      <td className={NUM} style={{ color: 'var(--ink-muted)', fontSize: 11.5 }}>{formatIST(p.timestamp)}</td>
      <td style={{ color: HEALTH_TEXT[s.health], fontWeight: 600, fontSize: 12.5 }}>
        {classificationLabel(s.classification)}
        {s.resolved && (
          <span className="t-meta" style={{ display: 'block', fontWeight: 400 }}>recovered</span>
        )}
      </td>
    </>
  );
}

export default function StationTableBand() {
  const snapshot = getNetworkSnapshot();
  const ordered = [...snapshot.stations].sort((a, b) => {
    // Not nominal first, then by state name. The registry is a working list,
    // so the stations that need a decision float to the top.
    const rank = (h: StationHealth) => (h === 'NOMINAL' ? 1 : 0);
    return rank(a.health) - rank(b.health) || a.stationId.localeCompare(b.stationId);
  });

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        className="flex flex-wrap items-baseline justify-between gap-2"
        style={{ borderBottom: '1px solid var(--hairline)', padding: '10px 14px', background: 'var(--surface-alt)' }}
      >
        <h3 className="t-card-title">Registered stations</h3>
        <span className="t-meta t-mono">{snapshot.stations.length} in this build · non-nominal first</span>
      </div>

      {/* Wide screens get the full registry. Narrow screens get a two-column
          layout that drops the raw channels — a table with seven columns is
          unreadable at 360px, and pretending otherwise is how tables get
          horizontally-scrolling. */}
      <div className="hidden lg:block" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <caption className="sr-only">
            All {snapshot.stations.length} registered automatic weather stations with their newest observation and QC
            decision
          </caption>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline-strong)' }}>
              <th scope="col" className={HEAD} style={{ padding: '8px 12px' }}>Station</th>
              <th scope="col" className={HEAD} style={{ padding: '8px 12px' }}>Location</th>
              <th scope="col" className={`${HEAD} ${NUM}`} style={{ padding: '8px 12px' }}>°C</th>
              <th scope="col" className={`${HEAD} ${NUM}`} style={{ padding: '8px 12px' }}>hPa</th>
              <th scope="col" className={`${HEAD} ${NUM}`} style={{ padding: '8px 12px' }}>RH %</th>
              <th scope="col" className={HEAD} style={{ padding: '8px 12px' }}>QC status</th>
              <th scope="col" className={HEAD} style={{ padding: '8px 12px' }}>Last update</th>
              <th scope="col" className={HEAD} style={{ padding: '8px 12px' }}>Decision</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((s) => (
              <tr key={s.stationId} style={{ borderBottom: '1px solid var(--hairline)' }}>
                <Cells station={s} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="lg:hidden">
        {ordered.map((s) => {
          const p = s.packet;
          return (
            <li key={s.stationId} style={{ borderBottom: '1px solid var(--hairline)', padding: '10px 13px' }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="t-mono" style={{ fontSize: 12, fontWeight: 600 }}>{s.stationId}</span>
                <span className="t-mono" style={{ fontSize: 10.5, fontWeight: 600, color: HEALTH_TEXT[s.health] }}>
                  {s.wmoFlag.replace('FLAG_', '')}
                </span>
              </div>
              <div className="t-body" style={{ marginTop: 1 }}>{s.name}</div>
              <div className="t-mono t-meta" style={{ marginTop: 3 }}>
                {p.raw.temperature === null ? '—' : p.raw.temperature.toFixed(1)} °C
                {' · '}
                {p.raw.pressure === null ? '—' : p.raw.pressure.toFixed(1)} hPa
                {' · '}
                {p.raw.humidity === null ? '—' : p.raw.humidity.toFixed(0)} % RH
              </div>
              <div className="t-meta t-mono" style={{ marginTop: 2 }}>
                {formatIST(p.timestamp)} · {classificationLabel(s.classification)}
              </div>
            </li>
          );
        })}
      </ul>

      <div style={{ padding: '10px 14px', background: 'var(--surface-alt)', borderTop: '1px solid var(--hairline)' }}>
        <p className="t-meta">
          Full registry with sensor kit, calibration certificate and RMC division:{' '}
          <Link href="/stations" style={{ color: 'var(--color-telemetry-text)' }}>/stations</Link>.
        </p>
      </div>
    </div>
  );
}
