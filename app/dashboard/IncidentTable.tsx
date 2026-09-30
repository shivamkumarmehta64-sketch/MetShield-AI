'use client';

import { clsx } from 'clsx';
import type { Incident, IncidentSeverity } from '@/lib/networkFeed';
import WmoFlagBadge from './WmoFlagBadge';
import { AlertTriangle, Activity, Wrench } from 'lucide-react';

const SEVERITY_TONE: Record<IncidentSeverity, string> = {
  CRITICAL: 'text-fault',
  MAJOR: 'text-warning',
  MINOR: 'text-ink-muted',
};

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
            {['Station', 'Detected (UTC)', 'Problem / Root cause', 'QC Flag', 'Operational State', 'Severity', 'Status', 'Recommended Action'].map(
              (h) => (
                <th key={h} scope="col" className="t-label whitespace-nowrap px-3.5 py-2.5">
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((inc) => {
            const isStorm = inc.classification === 'GENUINE_CONVECTIVE_EVENT' || inc.wmoFlag.includes('FLAG_2');
            const isFault = inc.classification === 'SENSOR_SPIKE' || inc.classification === 'FROZEN_VALUE' || inc.wmoFlag.includes('FLAG_4');
            const isDrift = inc.classification === 'CALIBRATION_DRIFT' || inc.wmoFlag.includes('FLAG_3');

            return (
              <tr key={inc.id} className="border-b border-hairline hover:bg-surface-hover transition-colors">
                {/* Station */}
                <td className="px-3.5 py-2.5">
                  <div className="t-mono text-[12px] font-bold text-navy">{inc.stationId}</div>
                  <div className="t-meta truncate max-w-[160px]">{inc.stationName}</div>
                </td>

                {/* Detected (UTC) */}
                <td className="t-mono px-3.5 py-2.5 text-[11.5px] whitespace-nowrap text-ink-muted">
                  {inc.timeUtc}
                </td>

                {/* Problem / Root cause */}
                <td className="px-3.5 py-2.5">
                  <div className="t-body font-semibold whitespace-nowrap text-ink">{inc.classificationLabel}</div>
                  <div className="t-meta text-[11.5px] line-clamp-1">{inc.diagnosticNote}</div>
                </td>

                {/* QC Flag */}
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <WmoFlagBadge flag={inc.wmoFlag} />
                </td>

                {/* Operational State (Weather vs Fault vs Drift) */}
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  {isStorm ? (
                    <span className="t-label px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-sky-50 text-sky-deep border border-sky-200 inline-flex items-center gap-1">
                      <Activity size={10} aria-hidden />
                      WEATHER EVENT
                    </span>
                  ) : isFault ? (
                    <span className="t-label px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-fault-bg text-fault-text border border-fault-border inline-flex items-center gap-1">
                      <AlertTriangle size={10} aria-hidden />
                      SENSOR FAULT
                    </span>
                  ) : isDrift ? (
                    <span className="t-label px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-warning-bg text-warning-text border border-warning-border inline-flex items-center gap-1">
                      <AlertTriangle size={10} aria-hidden />
                      WATCH / DRIFT
                    </span>
                  ) : (
                    <span className="t-label px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-surface-alt text-ink-muted border border-hairline">
                      TELEMETRY
                    </span>
                  )}
                </td>

                {/* Severity */}
                <td
                  className={clsx(
                    'px-3.5 py-2.5 t-label whitespace-nowrap font-mono',
                    isStorm ? 'text-sky-deep' : SEVERITY_TONE[inc.severity]
                  )}
                >
                  <span aria-hidden>{isStorm ? '●' : SEVERITY_ICON[inc.severity]} </span>
                  {inc.severity}
                </td>

                {/* Status */}
                <td className="px-3.5 py-2.5 t-body whitespace-nowrap">
                  {inc.status === 'ACTIVE' ? (
                    <span className={`font-semibold text-xs ${isStorm ? 'text-sky-deep' : 'text-fault-text'}`}>
                      Active
                    </span>
                  ) : (
                    <span className="text-ink-muted text-xs">Recovered</span>
                  )}
                </td>

                {/* Recommended Action */}
                <td className="px-3.5 py-2.5">
                  <div className="t-body text-[12.5px] font-medium text-ink">{inc.operationalAction}</div>
                  {inc.ticketId && (
                    <div className="t-mono text-[11px] text-fault-text font-semibold flex items-center gap-1 mt-0.5">
                      <Wrench size={11} aria-hidden />
                      <span>{inc.ticketId}</span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
