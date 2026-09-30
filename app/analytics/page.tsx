'use client';

import Shell from '../dashboard/Shell';
import KpiStrip from '../dashboard/KpiStrip';
import DataModeBadge from '../dashboard/DataModeBadge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  classificationBreakdown,
  computeKpis,
  flagBreakdown,
  getIncidents,
  getNetworkSnapshot,
  qualityTrend,
} from '@/lib/networkFeed';
import { wmoFlagMeta } from '../dashboard/WmoFlagBadge';

/**
 * §B — analytics.
 *
 * Semantic colour, not brand colour: fault red for hardware corruption, weather
 * orange for a genuine convective event, warning amber for drift, telemetry
 * blue for packet loss, healthy green for verified good, purple for the AI
 * view. This is a migration of meaning, not a global red→blue find-and-replace.
 */
const CLASSIFICATION_COLOR: Record<string, string> = {
  NOMINAL_OPERATION: 'var(--color-healthy)',
  GENUINE_CONVECTIVE_EVENT: 'var(--color-weather)',
  SENSOR_SPIKE: 'var(--color-fault)',
  FROZEN_VALUE: 'var(--color-fault)',
  CALIBRATION_DRIFT: 'var(--color-warning)',
  TELEMETRY_PACKET_LOSS: 'var(--color-telemetry)',
};

const TOOLTIP = {
  contentStyle: {
    fontSize: 12,
    border: '1px solid var(--color-hairline)',
    borderRadius: 6,
    background: 'var(--color-card)',
    color: 'var(--color-ink)',
  },
  labelStyle: { color: 'var(--color-ink-muted)' },
};

export default function AnalyticsPage() {
  const snapshot = getNetworkSnapshot();
  const kpis = computeKpis(snapshot);
  const incidents = getIncidents();

  // These three are pure functions of the engine's buffer and are themselves
  // memoised inside `lib/networkFeed`, so they are called directly. Wrapping
  // them again here in `useMemo(…, [])` bought nothing and tripped the React
  // Compiler's preserve-manual-memoization rule.
  const trend = qualityTrend();
  const byClassification = classificationBreakdown();
  const byFlag = flagBreakdown();

  const active = incidents.filter((i) => i.status === 'ACTIVE');
  const peak = trend.reduce((max, p) => Math.max(max, p.goodPct), 0);
  const trough = trend.reduce((min, p) => Math.min(min, p.goodPct), 100);

  return (
    <Shell breadcrumb="QC Analytics">
      <div className="flex flex-col gap-5">
        <KpiStrip />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="t-section-title text-navy">Network analytics</h1>
            <p className="t-card-title text-ink-muted">
              BENCHMARK REPLAY: 14-tick deterministic dataset over 21 registered station profiles
            </p>
            <p className="t-body text-ink-muted">
              {incidents.length} flagged packets across {snapshot.stations.length} stations in this
              run.
            </p>
          </div>
          <DataModeBadge />
        </div>

        <section className="card overflow-hidden" aria-label="Quality trend">
          <div className="border-b border-hairline px-5 py-3">
            <h2 className="t-card-title">Quality pass rate per tick</h2>
            <p className="t-meta">
              Share of stations at WMO Flag 1 across {trend.length} benchmark ticks.
            </p>
          </div>
          <div className="p-5">
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1">
              <span className="t-meta">
                Range {trough.toFixed(1)}% – {peak.toFixed(1)}%
              </span>
              <span className="t-meta">
                Final tick {trend[trend.length - 1]?.goodPct.toFixed(1) ?? '—'}%
              </span>
              <span className="t-meta">
                {trend[trend.length - 1]?.flagged ?? 0} station(s) not at Flag 1
              </span>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="tick"
                    tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                    label={{
                      value: 'Tick',
                      position: 'insideBottom',
                      offset: -2,
                      fontSize: 11,
                      fill: 'var(--color-ink-faint)',
                    }}
                  />
                  <YAxis
                    domain={['dataMin - 2', 100]}
                    tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    {...TOOLTIP}
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, 'At Flag 1']}
                    labelFormatter={(t) => `Tick ${t} · ${trend[Number(t)]?.timeUtc ?? ''} UTC`}
                  />
                  <Line
                    type="monotone"
                    dataKey="goodPct"
                    stroke="var(--color-telemetry)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="card overflow-hidden" aria-label="Anomaly classification breakdown">
            <div className="border-b border-hairline px-5 py-3">
              <h2 className="t-card-title">Anomalies by root cause</h2>
              <p className="t-meta">The engine&rsquo;s own classification, counted over every packet.</p>
            </div>
            <div className="p-5">
              {byClassification.every((r) => r.count === 0) ? (
                <p className="t-body text-ink-muted">No anomalies were raised in this run.</p>
              ) : (
                <div style={{ height: Math.max(160, byClassification.length * 44) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={byClassification}
                      layout="vertical"
                      margin={{ top: 0, right: 28, bottom: 0, left: 8 }}
                    >
                      <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={168}
                        tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip {...TOOLTIP} cursor={{ fill: 'var(--color-surface-hover)' }} />
                      <Bar dataKey="count" radius={3} isAnimationActive={false}>
                        {byClassification.map((row) => (
                          <Cell key={row.classification} fill={CLASSIFICATION_COLOR[row.classification]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          <section className="card overflow-hidden" aria-label="WMO flag breakdown">
            <div className="border-b border-hairline px-5 py-3">
              <h2 className="t-card-title">Anomalies by WMO flag</h2>
              <p className="t-meta">Counted per flag, using the WMO Pub No. 8 definitions.</p>
            </div>
            <ul>
              {byFlag.map(({ flag, count }) => {
                const meta = wmoFlagMeta(flag);
                const total = incidents.length || 1;
                return (
                  <li key={flag} className="border-b border-hairline last:border-b-0 px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="t-card-title flex items-center gap-2">
                        <meta.Icon size={15} className={meta.className} aria-hidden />
                        {meta.name}
                      </span>
                      <span className="t-mono text-[15px] font-semibold">{count}</span>
                    </div>
                    <p className="t-meta">{meta.meaning}</p>
                    <div
                      className="mt-2 h-1.5 rounded-full bg-surface-hover"
                      role="img"
                      aria-label={`${count} of ${total} flagged packets (${Math.round((count / total) * 100)}%)`}
                    >
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${(count / total) * 100}%`,
                          backgroundColor: 'var(--color-ink-muted)',
                        }}
                      />
                    </div>
                  </li>
                );
              })}
              {incidents.length === 0 && (
                <li className="px-5 py-6 t-body text-ink-muted">
                  No anomalies were raised in this run.
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* Multi-Parameter Observation Channel Health */}
        <section className="card overflow-hidden" aria-label="Observation channel parameters">
          <div className="border-b border-hairline px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="t-card-title text-navy">Observation Channel Parameters</h2>
              <p className="t-meta">Network-wide telemetry distribution across active meteorological channels.</p>
            </div>
            <span className="t-label font-mono text-[10.5px] px-2 py-0.5 rounded bg-surface-alt border border-hairline text-ink-muted">
              5 CHANNELS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-hairline">
            {/* Temperature */}
            <div className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-temperature)' }} />
                  <span className="t-label text-ink-muted">TEMPERATURE</span>
                </div>
                <div className="t-mono text-[22px] font-bold text-ink">
                  {(snapshot.stations.reduce((acc, s) => acc + (s.packet.raw.temperature ?? 0), 0) / snapshot.stations.length).toFixed(1)}
                  <span className="text-xs text-ink-muted font-normal ml-1">°C avg</span>
                </div>
              </div>
              <div className="mt-3 text-[11px] font-mono text-ink-faint border-t border-hairline pt-2">
                Min: {Math.min(...snapshot.stations.map((s) => s.packet.raw.temperature ?? 999)).toFixed(1)}°C · Max: {Math.max(...snapshot.stations.map((s) => s.packet.raw.temperature ?? -999)).toFixed(1)}°C
              </div>
            </div>

            {/* Pressure */}
            <div className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-pressure)' }} />
                  <span className="t-label text-ink-muted">PRESSURE</span>
                </div>
                <div className="t-mono text-[22px] font-bold text-ink">
                  {(snapshot.stations.reduce((acc, s) => acc + (s.packet.raw.pressure ?? 0), 0) / snapshot.stations.length).toFixed(1)}
                  <span className="text-xs text-ink-muted font-normal ml-1">hPa avg</span>
                </div>
              </div>
              <div className="mt-3 text-[11px] font-mono text-ink-faint border-t border-hairline pt-2">
                Min: {Math.min(...snapshot.stations.map((s) => s.packet.raw.pressure ?? 9999)).toFixed(1)} · Max: {Math.max(...snapshot.stations.map((s) => s.packet.raw.pressure ?? 0)).toFixed(1)} hPa
              </div>
            </div>

            {/* Humidity */}
            <div className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-humidity)' }} />
                  <span className="t-label text-ink-muted">HUMIDITY</span>
                </div>
                <div className="t-mono text-[22px] font-bold text-ink">
                  {(snapshot.stations.reduce((acc, s) => acc + (s.packet.raw.humidity ?? 0), 0) / snapshot.stations.length).toFixed(0)}
                  <span className="text-xs text-ink-muted font-normal ml-1">% avg</span>
                </div>
              </div>
              <div className="mt-3 text-[11px] font-mono text-ink-faint border-t border-hairline pt-2">
                Min: {Math.min(...snapshot.stations.map((s) => s.packet.raw.humidity ?? 100)).toFixed(0)}% · Max: {Math.max(...snapshot.stations.map((s) => s.packet.raw.humidity ?? 0)).toFixed(0)}%
              </div>
            </div>

            {/* Wind */}
            <div className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-wind)' }} />
                  <span className="t-label text-ink-muted">WIND GUST</span>
                </div>
                <div className="t-mono text-[22px] font-bold text-ink">
                  {(snapshot.stations.reduce((acc, s) => acc + (s.packet.raw.windSpeedKph ?? 0), 0) / snapshot.stations.length).toFixed(1)}
                  <span className="text-xs text-ink-muted font-normal ml-1">km/h avg</span>
                </div>
              </div>
              <div className="mt-3 text-[11px] font-mono text-ink-faint border-t border-hairline pt-2">
                Peak: {Math.max(...snapshot.stations.map((s) => s.packet.raw.windSpeedKph ?? 0)).toFixed(1)} km/h
              </div>
            </div>

            {/* Rain */}
            <div className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-rain)' }} />
                  <span className="t-label text-ink-muted">PRECIPITATION</span>
                </div>
                <div className="t-mono text-[22px] font-bold text-ink">
                  {(snapshot.stations.reduce((acc, s) => acc + (s.packet.raw.rainfallMm10min ?? 0), 0)).toFixed(1)}
                  <span className="text-xs text-ink-muted font-normal ml-1">mm total</span>
                </div>
              </div>
              <div className="mt-3 text-[11px] font-mono text-ink-faint border-t border-hairline pt-2">
                Max cell: {Math.max(...snapshot.stations.map((s) => s.packet.raw.rainfallMm10min ?? 0)).toFixed(1)} mm
              </div>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden" aria-label="State summary">
          <div className="border-b border-hairline px-5 py-3">
            <h2 className="t-card-title">Current network state</h2>
            <p className="t-meta">The same figures as the KPI strip, itemised.</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 md:grid-cols-3 xl:grid-cols-6">
            {[
              ['Stations', kpis.total],
              ['Verified good', kpis.nominal],
              ['Suspect drift', kpis.drift],
              ['Weather events', kpis.weatherEvents],
              ['Faults', kpis.faults],
              ['Telemetry issues', kpis.telemetryIssues],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="t-label">{label}</dt>
                <dd className="t-mono text-[26px] font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          {active.length > 0 && (
            <div className="border-t border-hairline px-5 py-4">
              <h3 className="t-label">Open incidents ({active.length})</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {active.map((inc) => (
                  <li key={inc.id} className="t-body text-ink-muted">
                    <span className="t-mono text-ink">{inc.stationId}</span> — {inc.classificationLabel}
                    <span className="text-ink-faint"> · {inc.diagnosticNote}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
