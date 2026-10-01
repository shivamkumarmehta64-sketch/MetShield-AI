'use client';

import React from 'react';
import { useSystem } from './SystemContext';
import { getNetworkSnapshot, classificationLabel, type StationHealth } from '@/lib/networkFeed';
import WmoFlagBadge from './WmoFlagBadge';
import WeatherReferencePanel from '@/components/dashboard/WeatherReferencePanel';

const HEALTH_CONFIG: Record<
  StationHealth,
  { label: string; bg: string; text: string; border: string; badge: string; isFault: boolean; isStorm: boolean }
> = {
  NOMINAL: {
    label: 'NOMINAL OPERATION',
    bg: 'var(--color-healthy-bg)',
    text: 'var(--color-healthy-text)',
    border: 'var(--color-healthy-border)',
    badge: 'FLAG_1',
    isFault: false,
    isStorm: false,
  },
  WEATHER_EVENT: {
    label: 'GENUINE WEATHER EVENT',
    bg: 'var(--color-weather-bg)',
    text: 'var(--color-weather-text)',
    border: 'var(--color-weather-border)',
    badge: 'FLAG_2',
    isFault: false,
    isStorm: true,
  },
  DRIFT: {
    label: 'CALIBRATION DRIFT',
    bg: 'var(--color-warning-bg)',
    text: 'var(--color-warning-text)',
    border: 'var(--color-warning-border)',
    badge: 'FLAG_3',
    isFault: false,
    isStorm: false,
  },
  FAULT: {
    label: 'CORRUPT HARDWARE / SENSOR SPIKE',
    bg: 'var(--color-fault-bg)',
    text: 'var(--color-fault-text)',
    border: 'var(--color-fault-border)',
    badge: 'FLAG_4',
    isFault: true,
    isStorm: false,
  },
  TELEMETRY: {
    label: 'TELEMETRY PACKET LOSS',
    bg: 'var(--color-fault-bg)',
    text: 'var(--color-fault-text)',
    border: 'var(--color-fault-border)',
    badge: 'FLAG_5',
    isFault: true,
    isStorm: false,
  },
};

export function InvestigationPanel() {
  const { state } = useSystem();
  const snapshot = getNetworkSnapshot();
  
  // Prefer the operator's explicitly picked station; fallback to first non-nominal station
  const station = state.selectedStationId
    ? snapshot.byId[state.selectedStationId]
    : snapshot.stations.find((s) => s.health !== 'NOMINAL') ?? snapshot.stations[0];

  if (!station) {
    return (
      <div className="card p-5 text-sm text-ink-muted">
        No station selected. Choose an AWS station from the matrix or map to inspect observations.
      </div>
    );
  }

  const { packet } = station;
  const cfg = HEALTH_CONFIG[station.health] ?? HEALTH_CONFIG.NOMINAL;
  const roc = packet.ratesOfChange;

  return (
    <div className="card overflow-hidden border border-hairline bg-card shadow-sm space-y-0">
      {/* ── Top Focus Header ── */}
      <div className="p-4 border-b border-hairline bg-surface-alt flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="t-label text-ink-muted block text-[10px]">SELECTED AWS STATION</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="t-mono font-bold text-[15px] text-navy">{station.stationId}</span>
            <span
              className="t-label px-2 py-0.5 rounded font-mono font-bold text-[10.5px]"
              style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
            >
              {cfg.label}
            </span>
          </div>
          <div className="text-xs text-ink-muted mt-0.5 font-medium">{station.name}</div>
        </div>

        <div className="text-right font-mono text-[11px] text-ink-faint">
          <div>{station.state} · {station.elevationM}m ASL</div>
          <div>WMO Block: {station.wmoBlockNo}</div>
        </div>
      </div>

      {/* ── WHAT: 5 Meteorological Channels ── */}
      <div className="p-4 border-b border-hairline">
        <div className="t-label text-ink-muted mb-2 text-[10.5px]">01 CURRENT OBSERVATION CHANNELS</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
          {/* Temperature */}
          <div className="p-2 rounded bg-surface-alt border border-hairline">
            <div className="text-[10px] text-ink-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-met-temperature)' }} />
              TEMP
            </div>
            <div className="text-base font-bold text-ink mt-0.5">
              {packet.raw.temperature?.toFixed(1) ?? '—'}
              <span className="text-[10px] text-ink-muted font-normal ml-0.5">°C</span>
            </div>
            {packet.imputed.temperature !== undefined && packet.imputed.temperature !== packet.raw.temperature && (
              <div className="text-[9.5px] text-warning font-semibold">imputed {packet.imputed.temperature.toFixed(1)}°C</div>
            )}
          </div>

          {/* Pressure */}
          <div className="p-2 rounded bg-surface-alt border border-hairline">
            <div className="text-[10px] text-ink-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-met-pressure)' }} />
              PRESSURE
            </div>
            <div className="text-base font-bold text-ink mt-0.5">
              {packet.raw.pressure?.toFixed(1) ?? '—'}
              <span className="text-[10px] text-ink-muted font-normal ml-0.5">hPa</span>
            </div>
          </div>

          {/* Humidity */}
          <div className="p-2 rounded bg-surface-alt border border-hairline">
            <div className="text-[10px] text-ink-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-met-humidity)' }} />
              HUMIDITY
            </div>
            <div className="text-base font-bold text-ink mt-0.5">
              {packet.raw.humidity?.toFixed(0) ?? '—'}
              <span className="text-[10px] text-ink-muted font-normal ml-0.5">%RH</span>
            </div>
          </div>

          {/* Wind */}
          <div className="p-2 rounded bg-surface-alt border border-hairline">
            <div className="text-[10px] text-ink-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-met-wind)' }} />
              WIND
            </div>
            <div className="text-base font-bold text-ink mt-0.5">
              {packet.raw.windSpeedKph?.toFixed(1) ?? '—'}
              <span className="text-[10px] text-ink-muted font-normal ml-0.5">km/h</span>
            </div>
          </div>

          {/* Rain */}
          <div className="p-2 rounded bg-surface-alt border border-hairline col-span-2 sm:col-span-1">
            <div className="text-[10px] text-ink-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-met-rain)' }} />
              RAIN
            </div>
            <div className="text-base font-bold text-ink mt-0.5">
              {packet.raw.rainfallMm10min?.toFixed(1) ?? '0.0'}
              <span className="text-[10px] text-ink-muted font-normal ml-0.5">mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── WHY: QC Decision & Physical Reasoning ── */}
      <div className="p-4 border-b border-hairline space-y-3">
        <div className="flex items-center justify-between">
          <span className="t-label text-ink-muted text-[10.5px]">02 QC DECISION & REASONING</span>
          <WmoFlagBadge flag={station.wmoFlag} />
        </div>

        <div
          className="p-3 rounded-lg border space-y-1.5"
          style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs" style={{ color: cfg.text }}>
              {classificationLabel(station.classification)}
            </span>
            <span className="t-mono font-bold text-[10.5px]" style={{ color: cfg.text }}>
              {station.wmoFlag}
            </span>
          </div>
          <p className="text-[12px] text-ink leading-relaxed">
            {packet.xaiAttribution.diagnosticNote}
          </p>
          <div className="text-[11px] font-mono text-ink-muted pt-1 border-t border-current/10 flex items-center justify-between">
            <span>Primary Trigger: {packet.xaiAttribution.primaryParameter}</span>
            <span>Alert Level: {station.alertLevel}</span>
          </div>
        </div>

        {/* Dynamic Rates of Change & Physical Checks */}
        <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-ink">
          <div className="p-2 rounded bg-surface-alt border border-hairline">
            <div className="text-[9.5px] text-ink-muted">ΔT ROC</div>
            <div className="font-bold mt-0.5">{roc.tempRoC > 0 ? `+${roc.tempRoC}` : roc.tempRoC} °C</div>
            <div className="text-[9.5px] text-ink-faint">{Math.abs(roc.tempRoC) < 4 ? 'PASS' : 'EXCEEDED'}</div>
          </div>
          <div className="p-2 rounded bg-surface-alt border border-hairline">
            <div className="text-[9.5px] text-ink-muted">ΔP ROC</div>
            <div className="font-bold mt-0.5">{roc.pressRoC > 0 ? `+${roc.pressRoC}` : roc.pressRoC} hPa</div>
            <div className="text-[9.5px] text-ink-faint">{Math.abs(roc.pressRoC) < 2 ? 'PASS' : 'EXCEEDED'}</div>
          </div>
          <div className="p-2 rounded bg-surface-alt border border-hairline">
            <div className="text-[9.5px] text-ink-muted">ΔRH ROC</div>
            <div className="font-bold mt-0.5">{roc.humRoC > 0 ? `+${roc.humRoC}` : roc.humRoC} %</div>
            <div className="text-[9.5px] text-ink-faint">{Math.abs(roc.humRoC) < 10 ? 'PASS' : 'EXCEEDED'}</div>
          </div>
        </div>
      </div>

      {/* ── 03 EXTERNAL WEATHER REFERENCE (advisory, subordinate) ──
          Sits below the QC decision on purpose. This is an independent
          second opinion, not an input: nothing in evaluate() reads it, and
          the panel says so in its own header so a screenshot taken out of
          context cannot imply otherwise. Collapsed and fetch-on-demand, so
          it costs nothing until an operator asks. */}
      <div className="p-4 border-b border-hairline">
        <WeatherReferencePanel
          key={station.stationId}
          stationId={station.stationId}
          stationName={station.name}
          lat={station.latitude}
          lon={station.longitude}
          station={{
            temperature: packet.raw.temperature ?? null,
            relativeHumidity: packet.raw.humidity ?? null,
            pressure: packet.raw.pressure ?? null,
            windSpeed: packet.raw.windSpeedKph ?? null,
          }}
        />
      </div>

      {/* ── ACTION: Operational Order ── */}
      <div className="p-4 bg-surface-alt flex flex-col justify-between">
        <div>
          <div className="t-label text-ink-muted mb-1 text-[10.5px]">04 OPERATIONAL ACTION</div>
          <div className="font-bold text-xs text-navy leading-snug mb-1">
            {cfg.isStorm
              ? 'RETAIN OBSERVATION FOR NWP ASSIMILATION'
              : cfg.isFault
                ? 'QUARANTINE OBSERVATION & DISPATCH WORK ORDER'
                : 'ACCEPTED IN ROUTINE ASSIMILATION STREAM'}
          </div>
          <p className="text-[11.5px] text-ink-muted leading-relaxed">
            {packet.operationalAction}
          </p>
        </div>

        {packet.ticketId && (
          <div className="mt-3 pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono">
            <span className="font-bold text-fault-text">MAINTENANCE TICKET:</span>
            <span className="font-semibold text-ink bg-card px-2 py-0.5 rounded border border-hairline">
              {packet.ticketId}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
