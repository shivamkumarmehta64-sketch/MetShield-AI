'use client';

import { useState } from 'react';
import { Search, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { getNetworkSnapshot, type StationHealth, type StationSnapshot } from '@/lib/networkFeed';
import { useSystem } from './SystemContext';
import WmoFlagBadge from './WmoFlagBadge';

const PAGE_SIZE = 12;

const HEALTH_OPTIONS: { value: 'ALL' | StationHealth; label: string }[] = [
  { value: 'ALL', label: 'All states' },
  { value: 'NOMINAL', label: 'Verified good' },
  { value: 'DRIFT', label: 'Suspect drift' },
  { value: 'WEATHER_EVENT', label: 'Weather event' },
  { value: 'FAULT', label: 'Fault' },
  { value: 'TELEMETRY', label: 'Packet loss' },
];

/** Row accent: a left-edge bar + faint tint so a non-nominal row reads as a
 *  state without a full fill. Nominal rows stay neutral. */
const ROW_TINT: Record<StationHealth, { bar: string; row: string }> = {
  NOMINAL: { bar: 'transparent', row: 'hover:bg-surface-hover' },
  DRIFT: { bar: 'var(--color-warning)', row: 'bg-warning-bg' },
  WEATHER_EVENT: { bar: 'var(--color-weather)', row: 'bg-weather-bg' },
  FAULT: { bar: 'var(--color-fault)', row: 'bg-fault-bg' },
  TELEMETRY: { bar: 'var(--color-telemetry)', row: 'bg-telemetry-bg' },
};

/** The header row, and the CSV column order, from one place. */
const COLUMNS = [
  'Station ID',
  'Station',
  'State',
  'RMC division',
  'Latitude',
  'Longitude',
  'Elevation (m)',
  'Temp (°C)',
  'Pressure (hPa)',
  'Humidity (%)',
  'Wind (km/h)',
  'Rain 10min (mm)',
  'WMO flag',
  'Root cause',
  'Health',
  'Alert',
  'Observation (UTC)',
] as const;

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function round(v: number | null | undefined, dp = 1): number | null {
  return v === null || v === undefined ? null : Math.round(v * 10 ** dp) / 10 ** dp;
}

function downloadCsv(rows: StationSnapshot[], filename: string) {
  const body = [
    COLUMNS.join(','),
    ...rows.map((s) =>
      [
        s.stationId,
        csvCell(s.name),
        csvCell(s.state),
        csvCell(s.rmcDivision),
        s.latitude,
        s.longitude,
        s.elevationM,
        round(s.packet.raw.temperature),
        round(s.packet.raw.pressure),
        round(s.packet.raw.humidity),
        round(s.packet.raw.windSpeedKph),
        round(s.packet.raw.rainfallMm10min),
        s.wmoFlag,
        s.classification,
        s.health,
        s.alertLevel,
        new Date(s.packet.timestamp).toISOString(),
      ].join(',')
    ),
  ].join('\n');

  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * The dashboard's station matrix.
 *
 * Two defects in the previous build are fixed here. The `↓ CSV` button had no
 * `onClick` at all — a dead control that looked like an export; it now exports
 * the rows actually on screen, with the real registry fields. And an empty
 * result set rendered "Showing 1–0 of 0", because the range was computed
 * unconditionally from a zero-length slice.
 *
 * Every figure is read from the engine's own buffer. Styling goes through the
 * design tokens like the rest of the console, not raw hex.
 */
export default function StationTable() {
  const snapshot = getNetworkSnapshot();
  const { selectStation, state } = useSystem();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | StationHealth>('ALL');
  const [page, setPage] = useState(0);

  const q = search.trim().toLowerCase();
  const filtered = snapshot.stations.filter((s) => {
    if (filter !== 'ALL' && s.health !== filter) return false;
    if (!q) return true;
    return (
      s.stationId.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.state.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const last = Math.min(start + PAGE_SIZE, filtered.length);

  return (
    <section className="card overflow-hidden" aria-label="Station matrix">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline px-5 py-3">
        <div>
          <h2 className="t-card-title">Station Matrix</h2>
          <p className="t-meta">
            {snapshot.stations.length} AWS stations · latest observation
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative">
            <label htmlFor="station-table-search" className="sr-only">
              Search stations by id, name or state
            </label>
            <Search
              size={13}
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="station-table-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="AWS-ID, name, state…"
              className="w-48 rounded border border-hairline bg-card py-1.5 pl-8 pr-2.5 text-[12.5px] placeholder:text-ink-faint"
            />
          </div>
          <div>
            <label htmlFor="station-table-filter" className="sr-only">
              Filter stations by QC state
            </label>
            <select
              id="station-table-filter"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as 'ALL' | StationHealth);
                setPage(0);
              }}
              className="rounded border border-hairline bg-card px-2.5 py-1.5 text-[12.5px]"
            >
              {HEALTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(pageItems, 'metshield-stations-page.csv')}
            disabled={pageItems.length === 0}
            className="touch-target inline-flex items-center gap-1.5 rounded border border-hairline-strong bg-card px-2.5 text-[12.5px] font-semibold text-navy hover:bg-surface-alt disabled:opacity-40"
          >
            <Download size={13} aria-hidden />
            CSV
          </button>
        </div>
      </div>

      {/* Seven columns at the desktop widths do not fit a 390 px phone. The
          min-width kept the numbers legible by letting the row scroll sideways,
          but a horizontally scrolling row is unusable with one thumb, and it
          widened the whole document. Below md the three secondary channels fold
          into a single line under the station name, so the two columns an
          operator actually scans — which station, and what state — stay put. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Registered stations with their latest observation and QC state
          </caption>
          <thead>
            <tr className="border-b border-hairline bg-surface-alt">
              {['Station', 'Temp', 'Pressure', 'RH', 'QC status', 'Observed (UTC)', ''].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className={clsx(
                    't-label whitespace-nowrap px-4 py-2.5',
                    (h === 'Temp' || h === 'Pressure' || h === 'RH' || h === 'Observed (UTC)') &&
                      'max-md:hidden'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((s) => {
              const tint = ROW_TINT[s.health];
              const selected = state.selectedStationId === s.stationId;
              return (
                <tr
                  key={s.stationId}
                  className={clsx(
                    'border-b border-hairline last:border-b-0',
                    selected ? 'bg-telemetry-bg' : tint.row
                  )}
                >
                  <td className="relative px-4 py-2.5">
                    {tint.bar !== 'transparent' && (
                      <span
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: tint.bar }}
                        aria-hidden
                      />
                    )}
                    <div className="t-mono text-[12px] font-semibold text-ink">{s.stationId}</div>
                    <div className="t-meta truncate">{s.name}</div>
                    {/* The phone layout's substitute for the three hidden
                        columns. Same values, same units, same em-dash for a
                        missing channel — folded, not dropped, because a QC
                        console must never hide a channel it holds. */}
                    <div className="t-mono mt-0.5 flex flex-wrap gap-x-2.5 text-[11.5px] text-ink-muted max-md:flex">
                      <span>
                        {s.packet.raw.temperature?.toFixed(1) ?? '—'}
                        <span className="text-[10px]"> °C</span>
                      </span>
                      <span>
                        {s.packet.raw.pressure?.toFixed(1) ?? '—'}
                        <span className="text-[10px]"> hPa</span>
                      </span>
                      <span>
                        {s.packet.raw.humidity?.toFixed(1) ?? '—'}
                        <span className="text-[10px]"> %RH</span>
                      </span>
                      <span>{new Date(s.packet.timestamp).toISOString().slice(11, 19)}Z</span>
                    </div>
                  </td>
                  <td className="t-mono whitespace-nowrap px-4 py-2.5 text-[13px] max-md:hidden">
                    {s.packet.raw.temperature?.toFixed(1) ?? '—'}
                    <span className="ml-0.5 text-[10px] text-ink-faint">°C</span>
                  </td>
                  <td className="t-mono whitespace-nowrap px-4 py-2.5 text-[13px] max-md:hidden">
                    {s.packet.raw.pressure?.toFixed(1) ?? '—'}
                    <span className="ml-0.5 text-[10px] text-ink-faint">hPa</span>
                  </td>
                  <td className="t-mono whitespace-nowrap px-4 py-2.5 text-[13px] max-md:hidden">
                    {s.packet.raw.humidity?.toFixed(1) ?? '—'}
                    <span className="ml-0.5 text-[10px] text-ink-faint">%</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <WmoFlagBadge flag={s.wmoFlag} />
                  </td>
                  <td className="t-mono whitespace-nowrap px-4 py-2.5 text-[12px] text-ink-muted max-md:hidden">
                    {new Date(s.packet.timestamp).toISOString().slice(11, 19)}Z
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => selectStation(s.stationId)}
                      aria-label={`Investigate ${s.stationId}, ${s.name}`}
                      className="touch-target rounded px-2 text-[13px] text-sky-deep hover:bg-surface-hover"
                    >
                      Investigate →
                    </button>
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center t-body text-ink-muted">
                  No station matches the current search and filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-5 py-3">
        <p className="t-meta" role="status">
          {filtered.length === 0
            ? 'No matches'
            : `Showing ${start + 1}–${last} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className={clsx(
              'touch-target rounded border px-3 py-1.5 text-[12.5px] font-semibold',
              currentPage === 0
                ? 'cursor-default border-hairline text-ink-faint'
                : 'border-hairline-strong text-navy hover:bg-surface-alt'
            )}
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className={clsx(
              'touch-target rounded border px-3 py-1.5 text-[12.5px] font-semibold',
              currentPage >= totalPages - 1
                ? 'cursor-default border-hairline text-ink-faint'
                : 'border-hairline-strong text-navy hover:bg-surface-alt'
            )}
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}
