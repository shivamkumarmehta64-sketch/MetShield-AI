'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { clsx } from 'clsx';
import type React from 'react';
import {
  getNetworkSnapshot,
  getIncidents,
  classificationLabel,
  type StationSnapshot,
} from '@/lib/networkFeed';
import { getInitialSeededDataset, type TelemetryPacket } from '@/lib/anomalyLogic';
import DataModeBadge from './DataModeBadge';
import WmoFlagBadge from './WmoFlagBadge';

/**
 * §C — live/network monitoring.
 *
 * This panel is rebuilt against the engine. The previous build was the single
 * worst fabrication in the repo: a `Math.random()` random walk presented under
 * a `>LIVE<` badge in the retired brand red, a hardcoded packet counter of
 * 12,847, a station selector offering four ids that do not exist in
 * `IMD_AWS_STATIONS`, and six hardcoded anomaly rows naming four unregistered
 * stations. None of it touched `lib/anomalyLogic.ts`.
 *
 * The rule this file now follows: every number is read off a real
 * `TelemetryPacket`, the station list is the real registry, and the packet
 * counter counts packets the engine actually produced in this buffer — not
 * packets that never existed.
 *
 * There is no timer. Nothing is a live feed; `DATA_MODE` says so and the badge
 * is rendered from that constant rather than from component state, so it cannot
 * drift from what `lib/networkFeed.ts` actually does.
 */

/** WMO Pub No. 8 plausible-range bounds, used for the out-of-range indicator. */
const RANGES = {
  temperature: { min: -10, max: 55, unit: '°C', label: 'Temperature' },
  pressure: { min: 870, max: 1084, unit: 'hPa', label: 'Pressure' },
  humidity: { min: 0, max: 100, unit: '%', label: 'Humidity' },
} as const;

type MetricKey = keyof typeof RANGES;

interface Metric {
  key: MetricKey;
  value: number | null | undefined;
  imputed: number | null | undefined;
}

const METRICS: MetricKey[] = ['temperature', 'pressure', 'humidity'];

/** Where a reading sits inside its WMO range, as a fraction. */
function inRangeFraction(key: MetricKey, value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const { min, max } = RANGES[key];
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** The reading a metrologist wants: corrected value if the engine imputed one. */
function displayValue(m: Metric): number | null | undefined {
  return m.imputed ?? m.value;
}

const CHART_SERIES: { key: string; name: string; axis: string; color: string }[] = [
  { key: 'pressure', name: 'Pressure (hPa)', axis: 'p', color: 'var(--color-telemetry)' },
  { key: 'temperature', name: 'Temperature (°C)', axis: 't', color: 'var(--color-weather)' },
  { key: 'humidity', name: 'Humidity (%)', axis: 'h', color: 'var(--color-teal)' },
];

interface ChartRow {
  i: number;
  time: string;
  temperature: number | null | undefined;
  pressure: number | null | undefined;
  humidity: number | null | undefined;
  classification: string;
  storm: boolean;
}

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

export default function TelemetryConsole() {
  const snapshot = getNetworkSnapshot();
  const incidents = getIncidents();

  const [selectedId, setSelectedId] = useState<string>(() => {
    // Open on a station that is actually showing something. Falling back to the
    // first registered station keeps the panel populated on an all-nominal run.
    const interesting = snapshot.stations.find((s) => s.health !== 'NOMINAL');
    return (interesting ?? snapshot.stations[0]).stationId;
  });

  const station: StationSnapshot | undefined =
    snapshot.byId[selectedId] ?? snapshot.stations[0];

  // The real per-station time series, straight out of the engine buffer. The
  // previous build synthesised this with a random walk; these are the packets
  // `getInitialSeededDataset()` actually produced, in tick order.
  const history: TelemetryPacket[] = station
    ? (getInitialSeededDataset().stationPackets[station.stationId] ?? [])
    : [];

  const chart = history.map((p, i) => ({
    i,
    time: new Date(p.timestamp).toISOString().slice(11, 19),
    temperature: p.raw.temperature,
    pressure: p.raw.pressure,
    humidity: p.raw.humidity,
    classification: p.classification,
    // The storm signature is a coupled drop. Marking the tick the engine
    // classified as convective lets the reader see the event on the curve
    // instead of inferring it from the axis.
    storm: p.classification === 'GENUINE_CONVECTIVE_EVENT',
  }));

  // Flagged packets for the selected station, newest first.
  const stationIncidents = incidents
    .filter((i) => i.stationId === station?.stationId)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Packets are counted from the buffer that produced them, so the figure moves
  // only when the engine has actually produced more. It is a count of real
  // packets, not a ticker.
  const totalPackets = Object.values(getInitialSeededDataset().stationPackets).reduce(
    (n, arr) => n + arr.length,
    0
  );

  const latest = station?.packet;

  const metrics: Metric[] = METRICS.map((key) => ({
    key,
    value: latest?.raw[key],
    imputed: latest?.imputed[key],
  }));

  if (!station || !latest) {
    return (
      <div className="card p-6">
        <p className="t-body text-ink-muted">No stations in the current run.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="t-section-title text-navy">Network monitoring</h2>
          <p className="t-meta">
            {history.length} packets in this station&rsquo;s buffer · {totalPackets} across the
            whole network · newest tick {new Date(latest.timestamp).toISOString().slice(11, 19)} UTC
          </p>
        </div>
        {/* Rendered from DATA_MODE, not from component state. */}
        <DataModeBadge />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_1fr]">
        {/* Station picker */}
        <section className="card overflow-hidden" aria-label="Select a station">
          <div className="border-b border-hairline px-4 py-3">
            <h3 className="t-card-title">Station</h3>
            <p className="t-meta">{snapshot.stations.length} registered</p>
          </div>
          <ul className="max-h-[420px] overflow-y-auto">
            {snapshot.stations.map((s) => (
              <li key={s.stationId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.stationId)}
                  aria-current={s.stationId === station.stationId ? 'true' : undefined}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 border-b border-hairline last:border-b-0 transition-colors',
                    s.stationId === station.stationId ? 'bg-surface-alt' : 'hover:bg-surface-hover'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="t-mono text-[12px] font-semibold text-ink">{s.stationId}</span>
                    {s.health !== 'NOMINAL' && <WmoFlagBadge flag={s.wmoFlag} />}
                  </div>
                  <div className="t-meta truncate">{s.name}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-5 min-w-0">
          {/* Latest observation */}
          <section className="card overflow-hidden" aria-label="Latest observation">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3">
              <div className="min-w-0">
                <h3 className="t-section-title text-navy">{station.name}</h3>
                <p className="t-meta">
                  {station.hindiName} · {station.stationId} · {station.state} ·{' '}
                  {latest.timeIST} IST
                </p>
              </div>
              <div className="flex items-center gap-2">
                <WmoFlagBadge flag={station.wmoFlag} />
                <span className="t-label text-ink-muted">
                  {classificationLabel(station.classification)}
                </span>
              </div>
            </div>

            <dl className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-3 sm:divide-y-0">
              {metrics.map((m) => {
                const { unit, label, min, max } = RANGES[m.key];
                const shown = displayValue(m);
                const frac = inRangeFraction(m.key, shown);
                const corrected = m.imputed !== undefined && m.imputed !== m.value;
                const outOfRange = frac !== null && (frac <= 0 || frac >= 1);
                return (
                  <div key={m.key} className="px-5 py-4">
                    <dt className="t-label">{label}</dt>
                    <dd className="mt-1 flex items-baseline gap-1.5">
                      <span
                        className={clsx(
                          't-mono text-[28px] font-bold leading-none',
                          outOfRange ? 'text-fault' : 'text-ink'
                        )}
                      >
                        {shown !== undefined && shown !== null ? shown.toFixed(1) : '—'}
                      </span>
                      <span className="t-meta">{unit}</span>
                    </dd>
                    <p className="t-meta mt-1.5">
                      {corrected ? (
                        <span className="text-warning">
                          corrected from {m.value?.toFixed(1)} {unit}
                        </span>
                      ) : outOfRange ? (
                        <span className="text-fault">outside WMO range {min}–{max} {unit}</span>
                      ) : (
                        <span className="text-ink-faint">
                          within WMO range {min}–{max} {unit}
                        </span>
                      )}
                    </p>
                    {frac !== null && (
                      <div className="mt-2 h-1 w-full rounded-full bg-surface-hover" aria-hidden>
                        <div
                          className="h-1 rounded-full"
                          style={{
                            width: `${frac * 100}%`,
                            backgroundColor: outOfRange
                              ? 'var(--color-fault)'
                              : 'var(--color-healthy)',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </dl>

            {/* What the engine actually said about this packet. */}
            <div className="border-t border-hairline bg-surface-alt px-5 py-3">
              <p className="t-body text-ink">{latest.xaiAttribution.diagnosticNote}</p>
              <p className="t-meta mt-1">
                Primary parameter: {latest.xaiAttribution.primaryParameter} · Operational action:{' '}
                {latest.operationalAction}
                {latest.ticketId ? ` · ${latest.ticketId}` : ''}
              </p>
            </div>
          </section>

          {/* The real time series */}
          <section className="card overflow-hidden" aria-label="Station time series">
            <div className="border-b border-hairline px-5 py-3">
              <h3 className="t-card-title">Observation history</h3>
              <p className="t-meta">
                Every packet the engine produced for {station.stationId} in this run, in tick order.
                Ticks are {((latest.timestamp - history[0]?.timestamp || 0) / 1000 / Math.max(1, history.length - 1)).toFixed(1)} s
                apart, not a calendar interval.
              </p>
            </div>
            <div className="p-5">
              {chart.length === 0 ? (
                <p className="t-body text-ink-muted">No packets buffered for this station.</p>
              ) : (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="i"
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
                        yAxisId="p"
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                      />
                      <YAxis yAxisId="h" orientation="right" domain={[0, 100]} hide />
                      <YAxis yAxisId="t" hide domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip
                        {...TOOLTIP}
                        labelFormatter={(
                          v: React.ReactNode,
                          payload: ReadonlyArray<{ payload?: ChartRow }>
                        ) => {
                          const row = payload?.[0]?.payload;
                          return `Tick ${String(v)}${row?.storm ? ' · convective event' : ''}`;
                        }}
                      />
                      <ReferenceLine
                        yAxisId="p"
                        stroke="var(--color-weather)"
                        strokeDasharray="4 4"
                        strokeOpacity={0.7}
                        label={{ value: 'event', position: 'top', fontSize: 10, fill: 'var(--color-weather)' }}
                      />
                      {CHART_SERIES.map((s) => (
                        <Line
                          key={s.key}
                          yAxisId={s.axis}
                          type="monotone"
                          dataKey={s.key}
                          name={s.name}
                          stroke={s.color}
                          strokeWidth={2}
                          dot={(props) =>
                            chart[props.index]?.storm ? (
                              <circle
                                key={`dot-${props.index}`}
                                cx={props.cx}
                                cy={props.cy}
                                r={3.5}
                                fill="var(--color-weather)"
                              />
                            ) : (
                              <></>
                            )
                          }
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    {CHART_SERIES.map((s) => (
                      <span key={s.key} className="t-meta flex items-center gap-1.5">
                        <span
                          aria-hidden
                          style={{ background: s.color }}
                          className="inline-block h-0.5 w-4 rounded-full"
                        />
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* This station's real flagged packets */}
          <section className="card overflow-hidden" aria-label="Flagged packets">
            <div className="border-b border-hairline px-5 py-3">
              <h3 className="t-card-title">Flagged packets for {station.stationId}</h3>
              <p className="t-meta">
                {stationIncidents.length === 0
                  ? 'The engine raised no flag on this station in this run.'
                  : `${stationIncidents.length} of this station's packets were flagged, newest first.`}
              </p>
            </div>
            {stationIncidents.length === 0 ? (
              <p className="px-5 py-6 t-body text-ink-muted">
                Every tick for this station classified as nominal operation.
              </p>
            ) : (
              <ul>
                {stationIncidents.map((inc) => (
                  <li
                    key={inc.id}
                    className="border-b border-hairline last:border-b-0 px-5 py-3 flex flex-wrap items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="t-mono text-[12px] text-ink-muted">{inc.timeUtc}</span>
                        <WmoFlagBadge flag={inc.wmoFlag} />
                        <span
                          className={clsx(
                            't-label',
                            inc.status === 'ACTIVE' ? 'text-fault' : 'text-ink-faint'
                          )}
                        >
                          {inc.status === 'ACTIVE' ? 'ACTIVE' : 'SUPERSEDED'}
                        </span>
                      </div>
                      <p className="t-body mt-1">{inc.diagnosticNote}</p>
                      <p className="t-meta mt-0.5">
                        {inc.classificationLabel} · primary {inc.primaryParameter} ·{' '}
                        {inc.operationalAction}
                        {inc.ticketId ? ` · ${inc.ticketId}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
