'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { IMD_AWS_STATIONS } from '@/lib/stationData';
import type { StationSnapshot } from '@/lib/networkFeed';
import WmoFlagBadge from './WmoFlagBadge';

const COLUMNS = [
  'Station',
  'Location',
  'Elevation',
  'Temperature',
  'Pressure',
  'RH',
  'QC state',
  'WMO flag',
] as const;

/** §E: the state is spelled out, not left to the badge's colour. */
const HEALTH_TEXT: Record<StationSnapshot['health'], string> = {
  NOMINAL: 'Verified good',
  DRIFT: 'Suspect drift',
  WEATHER_EVENT: 'Weather event',
  FAULT: 'Fault',
  TELEMETRY: 'Telemetry loss',
};

const HEALTH_TONE: Record<StationSnapshot['health'], string> = {
  NOMINAL: 'text-healthy',
  DRIFT: 'text-warning',
  WEATHER_EVENT: 'text-weather',
  FAULT: 'text-fault',
  TELEMETRY: 'text-telemetry',
};

/** A packet channel is `number | null`; a null channel renders as an em dash. */
function fmt(value: number | null | undefined, unit: string, digits = 1): string {
  return value == null ? '—' : `${value.toFixed(digits)} ${unit}`;
}

/**
 * The registry table backing `/stations`.
 *
 * Values come from the newest packet the engine produced for that station, and
 * the sensor and calibration metadata come from the station profile — nothing
 * here is typed in by hand.
 */
export default function StationRegistryTable({ rows }: { rows: StationSnapshot[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="px-5 py-10 text-center t-body text-ink-muted">
        No station matches this filter. Clear the search or choose a different QC state.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Registered observatories with the telemetry and quality-control state produced by the
          benchmark run
        </caption>
        <thead>
          <tr className="border-b border-hairline bg-surface-alt">
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className="t-label whitespace-nowrap px-3 py-2.5">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const profile = IMD_AWS_STATIONS.find((p) => p.stationId === s.stationId);
            const open = expanded === s.stationId;
            return (
              <Fragment key={s.stationId}>
                <tr className="border-b border-hairline hover:bg-surface-hover">
                  <th scope="row" className="px-3 py-2 font-normal">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : s.stationId)}
                      aria-expanded={open}
                      className="touch-target flex items-center gap-1.5 text-left"
                    >
                      {open ? (
                        <ChevronDown size={14} className="shrink-0" aria-hidden />
                      ) : (
                        <ChevronRight size={14} className="shrink-0" aria-hidden />
                      )}
                      <span className="t-mono text-[12.5px] font-semibold text-ink">
                        {s.stationId}
                      </span>
                    </button>
                  </th>
                  <td className="px-3 py-2">
                    <div className="t-body text-ink">{s.name}</div>
                    <div className="t-meta">
                      {s.state} · {s.rmcDivision}
                    </div>
                  </td>
                  <td className="t-mono px-3 py-2 text-[12.5px] whitespace-nowrap text-ink-muted">
                    {s.elevationM} m
                  </td>
                  <td className="t-mono px-3 py-2 text-[12.5px] whitespace-nowrap font-semibold">
                    {fmt(s.packet.raw.temperature, '°C')}
                  </td>
                  <td className="t-mono px-3 py-2 text-[12.5px] whitespace-nowrap font-semibold">
                    {fmt(s.packet.raw.pressure, 'hPa')}
                  </td>
                  <td className="t-mono px-3 py-2 text-[12.5px] whitespace-nowrap font-semibold">
                    {fmt(s.packet.raw.humidity, '%')}
                  </td>
                  <td className={clsx('px-3 py-2 t-body whitespace-nowrap', HEALTH_TONE[s.health])}>
                    {HEALTH_TEXT[s.health]}
                  </td>
                  <td className="px-3 py-2">
                    <WmoFlagBadge flag={s.wmoFlag} />
                  </td>
                </tr>
                {open && profile && (
                  <tr className="border-b border-hairline bg-surface-alt">
                    <td colSpan={COLUMNS.length} className="px-3 py-4">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
                        {[
                          ['Hindi name', profile.hindiName],
                          ['WMO block', profile.wmoBlockNo],
                          ['Coordinates', `${profile.latitude}° N, ${profile.longitude}° E`],
                          ['Datalogger', profile.sensorMetadata.dataloggerModel],
                          ['Uplink', profile.sensorMetadata.telemetryUplink],
                          ['Temperature sensor', profile.sensorMetadata.tempSensor],
                          ['Pressure sensor', profile.sensorMetadata.pressureSensor],
                          ['Humidity sensor', profile.sensorMetadata.humiditySensor],
                          ['Battery', profile.sensorMetadata.batteryVoltage],
                          ['Last calibration', profile.sensorMetadata.lastCalibDate],
                          ['Calibration certificate', profile.sensorMetadata.calibCertNo],
                          [
                            'History in buffer',
                            `${s.historyDepth} ticks · ${s.seededInjection ? 'seeded fault injection' : 'no injection'}`,
                          ],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="t-label">{label}</dt>
                            <dd className="t-body text-ink">{value}</dd>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
