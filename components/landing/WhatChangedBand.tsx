'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface ScenarioCase {
  id: 'weather' | 'spike' | 'drift';
  tabLabel: string;
  stationId: string;
  stationName: string;
  themeColor: string;
  themeBg: string;
  themeBorder: string;
  themeText: string;
  accentBadge: string;
  // Step 1: Observation
  observation: {
    channel: string;
    series: string[];
    highlight: string;
    secondaryChannels?: { label: string; values: string }[];
  };
  // Step 2: Change
  changeTitle: string;
  changeDetail: string;
  // Step 3: Pattern
  patternTitle: string;
  patternDetail: string;
  // Step 4: QC Decision
  qcFlag: string;
  decisionTitle: string;
  decisionNote: string;
  // Step 5: Action
  actionTitle: string;
  actionDetail: string;
}

const SCENARIOS: ScenarioCase[] = [
  {
    id: 'weather',
    tabLabel: '01 Genuine Weather Event',
    stationId: 'AWS-CHN-03',
    stationName: 'Meenambakkam Observatory, Chennai',
    themeColor: 'var(--color-weather)',
    themeBg: 'var(--color-weather-bg)',
    themeBorder: 'var(--color-weather-border)',
    themeText: 'var(--color-weather-text)',
    accentBadge: 'ATMOSPHERIC EVENT (BLUE)',
    observation: {
      channel: 'PRESSURE',
      series: ['1007.2 hPa', '1004.1 hPa', '1001.0 hPa'],
      highlight: 'ΔP = −3.1 hPa (FALLING)',
      secondaryChannels: [
        { label: 'HUMIDITY', values: '71% → 82% → 96% (+25% RH JUMP)' },
        { label: 'TEMPERATURE', values: '31.4°C → 29.1°C → 26.8°C (−4.6°C DROP)' },
      ],
    },
    changeTitle: 'MULTI-PARAMETER SYNCHRONOUS SHIFT',
    changeDetail: 'Rapid barometric depression coupled with sharp moisture saturation and evaporative cooling.',
    patternTitle: 'THERMODYNAMIC CONVECTIVE CRITERIA SATISFIED',
    patternDetail: 'Rule match: ΔP ≤ −2.5 hPa coupled with ΔRH ≥ +15% and ΔT ≤ −1.5°C in the same observation cycle.',
    qcFlag: 'FLAG_2',
    decisionTitle: 'GENUINE WEATHER EVENT',
    decisionNote: 'Classified as an intense squall/convective front. No sensor transducer failure.',
    actionTitle: 'RETAIN OBSERVATION FOR NWP ASSIMILATION',
    actionDetail: 'Data validated for numerical weather prediction stream. No field technician dispatch.',
  },
  {
    id: 'spike',
    tabLabel: '02 Corrupt Hardware / Spike',
    stationId: 'AWS-DEL-04',
    stationName: 'Safdarjung Observatory, New Delhi',
    themeColor: 'var(--color-fault)',
    themeBg: 'var(--color-fault-bg)',
    themeBorder: 'var(--color-fault-border)',
    themeText: 'var(--color-fault-text)',
    accentBadge: 'HARDWARE FAULT (RED)',
    observation: {
      channel: 'TEMPERATURE',
      series: ['31.2°C', '32.0°C', '31.5°C', '57.3°C'],
      highlight: '↑ UNPHYSICAL STEP-JUMP (+25.8°C)',
      secondaryChannels: [
        { label: 'PRESSURE', values: '1006.4 → 1006.3 → 1006.2 hPa (FLAT, NO GRADIENT)' },
        { label: 'HUMIDITY', values: '53% → 54% → 53% (FLAT, NO MOISTURE CHANGE)' },
      ],
    },
    changeTitle: 'ISOLATED TRANSDUCER EXCURSION',
    changeDetail: 'Thermistor jumped +25.8°C within a single 2.5s cycle while ambient atmosphere was stationary.',
    patternTitle: 'ABRUPT NON-METEOROLOGICAL CHANGE',
    patternDetail: 'Failed temporal persistence limit (|dX/dt| > 8.0°C) with zero thermodynamic coupling in P or RH.',
    qcFlag: 'FLAG_4',
    decisionTitle: 'CORRUPT HARDWARE / SENSOR SPIKE',
    decisionNote: 'Thermal probe open-circuit or ADC register glitch. Transducer telemetry corrupted.',
    actionTitle: 'QUARANTINE OBSERVATION & GENERATE WORK ORDER',
    actionDetail: 'Reading withheld from national NWP assimilation stream. Automated ticket TKT-DEL-04-T logged.',
  },
  {
    id: 'drift',
    tabLabel: '03 Calibration Drift',
    stationId: 'AWS-PUN-08',
    stationName: 'Shivajinagar Observatory, Pune',
    themeColor: 'var(--color-warning)',
    themeBg: 'var(--color-warning-bg)',
    themeBorder: 'var(--color-warning-border)',
    themeText: 'var(--color-warning-text)',
    accentBadge: 'SUSPECT SENSOR (AMBER)',
    observation: {
      channel: 'BAROMETRIC PRESSURE',
      series: ['1005.8 hPa', '1004.2 hPa', '1003.5 hPa'],
      highlight: 'PERSISTENT OFFSET: −2.3 hPa VS CALIBRATED BASELINE (1008.0 hPa)',
      secondaryChannels: [
        { label: 'HUMIDITY', values: '62% → 61% → 62% (NOMINAL DIURNAL)' },
        { label: 'TEMPERATURE', values: '28.1°C → 28.4°C (NOMINAL DIURNAL)' },
      ],
    },
    changeTitle: 'SYSTEMATIC RESIDUAL BIAS ACCUMULATION',
    changeDetail: 'Pressure reading exhibits continuous -2.3 hPa offset from regional station datum.',
    patternTitle: 'PERSISTENT OFFSET EXCEEDING LIMITS',
    patternDetail: 'Rule match: |accumulated offset| > 2.0 hPa sustained over 6 consecutive cycles without storm coupling.',
    qcFlag: 'FLAG_3',
    decisionTitle: 'SUSPECT SENSOR / CALIBRATION DRIFT',
    decisionNote: 'Diaphragm fatigue or analog reference voltage drift. Observation accuracy degraded.',
    actionTitle: 'FLAG AS SUSPECT & SCHEDULE FIELD CALIBRATION',
    actionDetail: 'Observation flagged for climatology review; maintenance ticket dispatched for on-site barometer verification.',
  },
];

export default function WhatChangedBand() {
  const [activeTab, setActiveTab] = useState<'weather' | 'spike' | 'drift'>('weather');
  const active = SCENARIOS.find((s) => s.id === activeTab) ?? SCENARIOS[0];

  return (
    <div className="card overflow-hidden border border-hairline bg-card shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface-alt px-5 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-navy" aria-hidden />
            <h3 className="t-card-title text-navy">WHAT CHANGED? — THE CENTRAL DISCRIMINATION PROBLEM</h3>
          </div>
          <p className="t-meta text-ink-muted mt-0.5">
            Understand how MetShield AI discriminates real atmospheric dynamics from transducer faults in under 10 seconds.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap gap-1 p-1 rounded-md bg-card border border-hairline" role="tablist">
          {SCENARIOS.map((s) => {
            const isSelected = s.id === activeTab;
            return (
              <button
                key={s.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => setActiveTab(s.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-navy text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
                }`}
              >
                {s.tabLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main active scenario inspection canvas */}
      <div className="p-5 space-y-5">
        {/* Station Subheader */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-hairline">
          <div className="flex items-baseline gap-2.5">
            <span className="t-mono font-bold text-sm text-navy">{active.stationId}</span>
            <span className="text-xs text-ink-muted">{active.stationName}</span>
          </div>
          <span
            className="t-label px-2 py-0.5 rounded font-mono font-bold text-[10px]"
            style={{
              backgroundColor: active.themeBg,
              color: active.themeText,
              border: `1px solid ${active.themeBorder}`,
            }}
          >
            {active.accentBadge}
          </span>
        </div>

        {/* 5-Step Visual Flow: OBSERVATION → CHANGE → PATTERN → QC DECISION → ACTION */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Step 1: Observation */}
          <div className="p-3.5 rounded border border-hairline bg-surface-alt flex flex-col justify-between">
            <div>
              <div className="t-label text-ink-muted mb-1.5 flex items-center justify-between">
                <span>01 OBSERVATION</span>
                <span className="font-mono text-[10px] text-ink-faint">RAW FEED</span>
              </div>
              <div className="t-mono font-bold text-xs text-ink mb-1">{active.observation.channel}</div>
              <div className="t-mono text-[11.5px] text-ink-muted space-y-0.5 leading-snug">
                {active.observation.series.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="text-ink-faint">t{idx}:</span>
                    <span className="font-semibold text-ink">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-hairline">
              <span className="t-mono text-[10.5px] font-bold block" style={{ color: active.themeText }}>
                {active.observation.highlight}
              </span>
            </div>
          </div>

          {/* Step 2: Change */}
          <div className="p-3.5 rounded border border-hairline bg-surface-alt flex flex-col justify-between">
            <div>
              <div className="t-label text-ink-muted mb-1.5 flex items-center justify-between">
                <span>02 CHANGE</span>
                <span className="font-mono text-[10px] text-ink-faint">DELTA dT</span>
              </div>
              <div className="font-bold text-xs text-ink mb-1.5 leading-snug">{active.changeTitle}</div>
              <p className="text-[11.5px] text-ink-muted leading-relaxed">{active.changeDetail}</p>
            </div>
            {active.observation.secondaryChannels && (
              <div className="mt-3 pt-2 border-t border-hairline text-[10px] text-ink-faint font-mono space-y-0.5">
                {active.observation.secondaryChannels.map((c, i) => (
                  <div key={i}>
                    <span className="font-semibold text-ink-muted">{c.label}:</span> {c.values}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Pattern */}
          <div className="p-3.5 rounded border border-hairline bg-surface-alt flex flex-col justify-between">
            <div>
              <div className="t-label text-ink-muted mb-1.5 flex items-center justify-between">
                <span>03 PATTERN</span>
                <span className="font-mono text-[10px] text-ink-faint">RULE EVAL</span>
              </div>
              <div className="font-bold text-xs text-ink mb-1.5 leading-snug">{active.patternTitle}</div>
              <p className="text-[11.5px] text-ink-muted leading-relaxed">{active.patternDetail}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-hairline">
              <span className="t-label text-[10px] text-ink-faint">Deterministic logic check</span>
            </div>
          </div>

          {/* Step 4: QC Decision */}
          <div
            className="p-3.5 rounded border flex flex-col justify-between"
            style={{
              backgroundColor: active.themeBg,
              borderColor: active.themeBorder,
            }}
          >
            <div>
              <div className="t-label mb-1.5 flex items-center justify-between" style={{ color: active.themeText }}>
                <span>04 QC DECISION</span>
                <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-card/80">
                  {active.qcFlag}
                </span>
              </div>
              <div className="font-bold text-xs mb-1.5 leading-snug" style={{ color: active.themeText }}>
                {active.decisionTitle}
              </div>
              <p className="text-[11.5px] text-ink leading-relaxed">{active.decisionNote}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-current/10">
              <span className="t-label text-[10px]" style={{ color: active.themeText }}>
                Cascade Stage: {active.qcFlag === 'FLAG_2' ? 'Storm Tier' : 'Transducer Tier'}
              </span>
            </div>
          </div>

          {/* Step 5: Action */}
          <div
            className="p-3.5 rounded border flex flex-col justify-between bg-card"
            style={{ borderColor: active.themeBorder }}
          >
            <div>
              <div className="t-label text-ink-muted mb-1.5 flex items-center justify-between">
                <span>05 ACTION</span>
                <span className="font-mono text-[10px]" style={{ color: active.themeText }}>
                  EXECUTION
                </span>
              </div>
              <div className="font-bold text-xs text-ink mb-1.5 leading-snug">{active.actionTitle}</div>
              <p className="text-[11.5px] text-ink-muted leading-relaxed">{active.actionDetail}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-hairline flex items-center gap-1 font-bold text-[11px]" style={{ color: active.themeText }}>
              <span>OPERATOR PIPELINE</span>
              <ArrowRight size={12} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
