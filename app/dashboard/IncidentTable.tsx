'use client';

import { clsx } from 'clsx';
import type { Incident, IncidentSeverity } from '@/lib/networkFeed';
import WmoFlagBadge from './WmoFlagBadge';

const SEVERITY_TONE: Record<IncidentSeverity, string> = {
  CRITICAL: 'text-fault',
  MAJOR: 'text-warning',
  MINOR: 'text-ink-muted',
};

/** §E: the severity word is always spelled out next to the colour. */
const SEVERITY_ICON: Record<IncidentSeverity, string> = {
  CRITICAL: '▲',
  MAJOR: '●',
  MINOR: '·',
};

export default function IncidentTable({ rows }: { rows: Incident[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-10 text-center t-body text-ink-muted">
        No incident matches these filters. Widen the date range or clear the severity filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Flagged telemetry packets raised by the quality-control engine</caption>
        <thead>
          <tr className="border-b border-hairline bg-surface-alt">
            {['Incident', 'UTC time', 'Station', 'Classification', 'WMO flag', 'Severity', 'Status', 'Operational action'].map(
              (h) => (
                <th key={h} scope="col" className="t-label whitespace-nowrap px-3 py-2.5">
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((inc) => (
            <tr key={inc.id} className="border-b border-hairline hover:bg-surface-hover">
              <td className="t-mono px-3 py-2 text-[11.5px] whitespace-nowrap text-ink-muted">
                {inc.id}
              </td>
              <td className="t-mono px-3 py-2 text-[11.5px] whitespace-nowrap text-ink-muted">
                {inc.timeUtc}
              </td>
              <td className="px-3 py-2">
                <div className="t-mono text-[12px] font-semibold">{inc.stationId}</div>
                <div className="t-meta">{inc.stationName}</div>
              </td>
              <td className="px-3 py-2">
                <div className="t-body whitespace-nowrap">{inc.classificationLabel}</div>
                <div className="t-meta">{inc.diagnosticNote}</div>
              </td>
              <td className="px-3 py-2">
                <WmoFlagBadge flag={inc.wmoFlag} />
              </td>
              <td
                className={clsx(
                  'px-3 py-2 t-label whitespace-nowrap',
                  SEVERITY_TONE[inc.severity]
                )}
              >
                <span aria-hidden>{SEVERITY_ICON[inc.severity]} </span>
                {inc.severity}
              </td>
              <td className="px-3 py-2 t-body whitespace-nowrap">
                {inc.status === 'ACTIVE' ? (
                  <span className="font-semibold text-fault">Active</span>
                ) : (
                  <span className="text-ink-muted">Recovered</span>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="t-body text-ink-muted">{inc.operationalAction}</div>
                {inc.ticketId && (
                  <div className="t-mono text-[11px] text-ink-faint">{inc.ticketId}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
