'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Shell from '../dashboard/Shell';
import KpiStrip from '../dashboard/KpiStrip';
import StationRegistryTable from '../dashboard/StationRegistryTable';
import DataModeBadge from '../dashboard/DataModeBadge';
import { getNetworkSnapshot, type StationHealth } from '@/lib/networkFeed';
import { IMD_AWS_STATIONS } from '@/lib/stationData';
import type { IMDStationProfile } from '@/lib/stationData';

const LeafletMap = dynamic(() => import('../dashboard/LeafletMap'), { ssr: false });

/** The five operational states, in the order they should be filtered. §E. */
const FILTERS: { key: StationHealth | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All stations' },
  { key: 'NOMINAL', label: 'Verified good' },
  { key: 'DRIFT', label: 'Suspect drift' },
  { key: 'WEATHER_EVENT', label: 'Weather event' },
  { key: 'FAULT', label: 'Fault' },
  { key: 'TELEMETRY', label: 'Telemetry' },
];

/**
 * The national station registry.
 *
 * This page used to render a hand-written `STATIONS` array of ten rows with
 * invented identifiers, elevations and QC states — AWS-MUM-04, AWS-CCU-02,
 * AWS-MAA-03, AWS-PNQ-08, AWS-GAU-13 — none of which exist in
 * `IMD_AWS_STATIONS`, and it omitted the twelve that do. Every figure below is
 * now joined against the real registry and the real engine output.
 */
export default function StationsPage() {
  const snapshot = getNetworkSnapshot();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StationHealth | 'ALL'>('ALL');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snapshot.stations.filter((s) => {
      if (filter !== 'ALL' && s.health !== filter) return false;
      if (!q) return true;
      const profile: IMDStationProfile | undefined = IMD_AWS_STATIONS.find(
        (p) => p.stationId === s.stationId
      );
      return (
        s.stationId.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.rmcDivision.toLowerCase().includes(q) ||
        (profile?.wmoBlockNo.toLowerCase().includes(q) ?? false)
      );
    });
  }, [snapshot.stations, query, filter]);

  return (
    <Shell breadcrumb="Station Registry">
      <div className="flex flex-col gap-5">
        <KpiStrip />

        <LeafletMap />

        <section className="card overflow-hidden" aria-label="Station registry">
          <div className="border-b border-hairline px-5 py-3 flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h2 className="t-card-title">Registered observatories</h2>
              <p className="t-meta">
                {rows.length} of {snapshot.stations.length} stations shown · every row joined against
                the station registry and the QC engine
              </p>
            </div>
            <DataModeBadge />
          </div>

          <div className="border-b border-hairline px-5 py-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by QC state">
              {FILTERS.map((f) => {
                const selected = f.key === filter;
                const count =
                  f.key === 'ALL'
                    ? snapshot.stations.length
                    : snapshot.stations.filter((s) => s.health === f.key).length;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    aria-pressed={selected}
                    className={
                      selected
                        ? 'touch-target rounded border border-hairline-strong bg-surface-alt px-2.5 text-[12.5px] font-semibold text-navy'
                        : 'touch-target rounded border border-hairline px-2.5 text-[12.5px] text-ink-muted hover:bg-surface-hover'
                    }
                  >
                    {f.label}
                    <span className="ml-1.5 font-mono text-[11px] text-ink-faint">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="ml-auto w-full sm:w-64">
              <label htmlFor="station-search" className="sr-only">
                Search stations by id, name, state, division or WMO block
              </label>
              <input
                id="station-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search id, name, state, WMO block"
                className="w-full rounded border border-hairline bg-card px-3 py-2 text-[13px] placeholder:text-ink-faint"
              />
            </div>
          </div>

          <StationRegistryTable rows={rows} />
        </section>
      </div>
    </Shell>
  );
}
