'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import Shell from '../dashboard/Shell';
import KpiStrip from '../dashboard/KpiStrip';
import IncidentTable from '../dashboard/IncidentTable';
import DataModeBadge from '../dashboard/DataModeBadge';
import { getIncidents, type IncidentSeverity } from '@/lib/networkFeed';

const SEVERITIES: (IncidentSeverity | 'ALL')[] = ['ALL', 'CRITICAL', 'MAJOR', 'MINOR'];

/**
 * §I — the incident log.
 *
 * The rows come from `getIncidents()`, which walks the engine's own buffer. The
 * previous build showed a hand-written table of twelve rows — including four
 * station ids that are not in the registry — behind a filter bar whose Apply
 * button did nothing and two export buttons with no handler.
 */
export default function IncidentsPage() {
  const all = getIncidents();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity | 'ALL'>('ALL');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'RECOVERED'>('ALL');
  const [station, setStation] = useState('');

  const rows = useMemo(() => {
    const q = station.trim().toLowerCase();
    return all.filter((inc) => {
      // Date bounds compare against the incident's own UTC timestamp.
      const day = inc.timeUtc.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (severity !== 'ALL' && inc.severity !== severity) return false;
      if (status !== 'ALL' && inc.status !== status) return false;
      if (q && !inc.stationId.toLowerCase().includes(q) && !inc.stationName.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [all, from, to, severity, status, station]);

  function download(kind: 'csv' | 'json') {
    const body =
      kind === 'json'
        ? JSON.stringify(rows, null, 2)
        : [
            'incident_id,packet_id,time_utc,station_id,station_name,classification,wmo_flag,severity,status,operational_action,ticket_id',
            ...rows.map((r) =>
              [
                r.id,
                r.packetId,
                r.timeUtc,
                r.stationId,
                `"${r.stationName}"`,
                r.classification,
                r.wmoFlag,
                r.severity,
                r.status,
                `"${r.operationalAction}"`,
                r.ticketId ?? '',
              ].join(',')
            ),
          ].join('\n');

    const url = URL.createObjectURL(
      new Blob([body], { type: kind === 'json' ? 'application/json' : 'text/csv' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `metshield-incidents.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell breadcrumb="Incident Log">
      <div className="flex flex-col gap-5">
        <KpiStrip />

        <section className="card overflow-hidden" aria-label="Incident registry">
          <div className="border-b border-hairline px-5 py-3 flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h1 className="t-section-title text-navy">Incident log</h1>
              <p className="t-meta">
                Flagged observations from the QC engine · newest first
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DataModeBadge />
              <button
                type="button"
                onClick={() => download('csv')}
                disabled={rows.length === 0}
                className="touch-target inline-flex items-center gap-1.5 rounded border border-hairline-strong bg-card px-3 text-[12.5px] font-semibold text-navy hover:bg-surface-alt disabled:opacity-40"
              >
                <Download size={14} aria-hidden />
                CSV
              </button>
              <button
                type="button"
                onClick={() => download('json')}
                disabled={rows.length === 0}
                className="touch-target inline-flex items-center gap-1.5 rounded border border-hairline-strong bg-card px-3 text-[12.5px] font-semibold text-navy hover:bg-surface-alt disabled:opacity-40"
              >
                <Download size={14} aria-hidden />
                JSON
              </button>
            </div>
          </div>

          {/* The filters apply as they are changed. There is no Apply button,
              because a button that does nothing is worse than no button. */}
          <div className="border-b border-hairline px-5 py-3 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="inc-from" className="t-label block">
                From
              </label>
              <input
                id="inc-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 rounded border border-hairline bg-card px-2.5 py-1.5 text-[12.5px]"
              />
            </div>
            <div>
              <label htmlFor="inc-to" className="t-label block">
                To
              </label>
              <input
                id="inc-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 rounded border border-hairline bg-card px-2.5 py-1.5 text-[12.5px]"
              />
            </div>
            <div>
              <label htmlFor="inc-sev" className="t-label block">
                Severity
              </label>
              <select
                id="inc-sev"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity | 'ALL')}
                className="mt-1 rounded border border-hairline bg-card px-2.5 py-1.5 text-[12.5px]"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? 'All' : s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="inc-status" className="t-label block">
                Status
              </label>
              <select
                id="inc-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ALL' | 'ACTIVE' | 'RECOVERED')}
                className="mt-1 rounded border border-hairline bg-card px-2.5 py-1.5 text-[12.5px]"
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="RECOVERED">Recovered</option>
              </select>
            </div>
            <div>
              <label htmlFor="inc-station" className="t-label block">
                Station
              </label>
              <input
                id="inc-station"
                type="search"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                placeholder="AWS-ID or name"
                className="mt-1 w-44 rounded border border-hairline bg-card px-2.5 py-1.5 text-[12.5px] placeholder:text-ink-faint"
              />
            </div>
            <p className="ml-auto t-meta" role="status">
              Showing {rows.length} of {all.length} incidents
            </p>
          </div>

          <IncidentTable rows={rows} />
        </section>
      </div>
    </Shell>
  );
}
