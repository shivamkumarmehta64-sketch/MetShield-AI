'use client';

import React from 'react';
import { ArrowRight, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';

/**
 * HeroVisual: A restrained, scientific meteorological operations visual.
 * 
 * Visually communicates:
 * AWS Station Telemetry (5 channels) 
 *   → Quality Control Decision Filter
 *   → Deterministic Resolution (Genuine Weather Retained vs Hardware Fault Quarantined)
 * 
 * Strict styling: Calm light surfaces, crisp hairlines, semantic colors.
 * Zero neon, zero cyberpunk, zero fake animations.
 */
export default function HeroVisual() {
  return (
    <div className="w-full card overflow-hidden border border-hairline bg-card shadow-sm">
      {/* Instrument Terminal Header */}
      <div className="flex items-center justify-between border-b border-hairline bg-surface-alt px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-navy/20 border border-navy/40" aria-hidden />
          <span className="t-label font-bold text-navy">AWS-DEL-04 OBSERVATION TELEMETRY PIPELINE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="t-mono text-[11px] text-ink-muted">STATION DATUM: 216m ASL</span>
          <span className="t-label px-2 py-0.5 rounded bg-surface-hover border border-hairline font-mono text-[10px]">
            DETERMINISTIC QC
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Step 1: AWS Multi-Channel Observations (5 channels) */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-hairline">
            <span className="t-label text-ink-muted">01 INGESTION (5 CHANNELS)</span>
            <span className="t-mono text-[11px] text-ink-faint">2.5s Cycle</span>
          </div>

          {/* 5 Channels with Stable Meteorological Semantic Colors */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-surface-alt border border-hairline">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-temperature)' }} />
                <span className="font-semibold text-ink">TEMP (T)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-ink">31.2</span>
                <span className="text-[10px] text-ink-muted">°C</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-surface-alt border border-hairline">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-pressure)' }} />
                <span className="font-semibold text-ink">PRESSURE (P)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-ink">1006.4</span>
                <span className="text-[10px] text-ink-muted">hPa</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-surface-alt border border-hairline">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-humidity)' }} />
                <span className="font-semibold text-ink">HUMIDITY (RH)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-ink">53.0</span>
                <span className="text-[10px] text-ink-muted">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-surface-alt border border-hairline">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-wind)' }} />
                <span className="font-semibold text-ink">WIND (W)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-ink">12.4</span>
                <span className="text-[10px] text-ink-muted">km/h</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-surface-alt border border-hairline">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-met-rain)' }} />
                <span className="font-semibold text-ink">RAIN (10m)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-ink">0.0</span>
                <span className="text-[10px] text-ink-muted">mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Quality Control Discrimination Filter */}
        <div className="lg:col-span-4 flex flex-col justify-center">
          <div className="p-3.5 rounded-lg border-2 border-dashed border-hairline-strong bg-surface-alt/70 space-y-3">
            <div className="flex items-center gap-2 text-navy pb-1.5 border-b border-hairline">
              <ShieldCheck size={16} className="text-sky-deep" />
              <span className="t-label font-bold text-navy">02 PHYSICAL DISCRIMINATOR</span>
            </div>

            <div className="space-y-2 text-[11.5px] leading-snug">
              <div className="p-2 rounded bg-card border border-hairline">
                <div className="font-bold text-ink flex items-center justify-between mb-0.5">
                  <span>WMO-No. 8 Limits</span>
                  <span className="text-healthy-text text-[10px] font-mono">PASS [−90..70°C]</span>
                </div>
                <span className="text-ink-muted text-[11px]">Validates physical range at ingestion boundary.</span>
              </div>

              <div className="p-2 rounded bg-card border border-hairline">
                <div className="font-bold text-ink flex items-center justify-between mb-0.5">
                  <span>Thermodynamic Coupling</span>
                  <span className="text-sky-deep text-[10px] font-mono">ΔP ∧ ΔRH EVAL</span>
                </div>
                <span className="text-ink-muted text-[11px]">
                  ΔP ≤ −2.5 hPa coupled with ΔRH ≥ +15% isolates genuine storms.
                </span>
              </div>

              <div className="p-2 rounded bg-card border border-hairline">
                <div className="font-bold text-ink flex items-center justify-between mb-0.5">
                  <span>Temporal Continuity</span>
                  <span className="text-warning-text text-[10px] font-mono">|dX/dt| EVAL</span>
                </div>
                <span className="text-ink-muted text-[11px]">
                  Detects unphysical step-jumps and transducer register lock.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Two Distinct Deterministic Outcomes */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-hairline">
            <span className="t-label text-ink-muted">03 DUAL OPERATIONAL ACTIONS</span>
            <span className="t-mono text-[11px] text-ink-faint">Rule-Based Output</span>
          </div>

          {/* Genuine Weather Action (Blue #0EA5E9) */}
          <div className="p-3 rounded-lg border border-sky/30 bg-telemetry-bg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="t-mono text-[11px] font-bold text-sky-deep tracking-wider flex items-center gap-1.5">
                <Activity size={13} className="text-sky-deep" />
                GENUINE WEATHER EVENT
              </span>
              <span className="t-label font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-deep font-bold text-[10px]">
                FLAG_2
              </span>
            </div>
            <p className="text-[11.5px] text-ink leading-snug">
              Thermodynamic consistency satisfied across pressure & moisture channels.
            </p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-sky-deep pt-0.5">
              <span>ACTION: RETAIN FOR NWP ASSIMILATION</span>
              <ArrowRight size={12} />
            </div>
          </div>

          {/* Hardware Fault Action (Red #EF4444) */}
          <div className="p-3 rounded-lg border border-fault-border bg-fault-bg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="t-mono text-[11px] font-bold text-fault-text tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-fault-text" />
                SENSOR TRANSDUCER FAULT
              </span>
              <span className="t-label font-mono px-1.5 py-0.5 rounded bg-fault-bg text-fault-text font-bold text-[10px]">
                FLAG_4 / 3
              </span>
            </div>
            <p className="text-[11.5px] text-ink leading-snug">
              Isolated spike or drift unconfirmed by surrounding physical channels.
            </p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-fault-text pt-0.5">
              <span>ACTION: QUARANTINE & DISPATCH TICKET</span>
              <ArrowRight size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Strip */}
      <div className="border-t border-hairline bg-surface-alt px-4 py-2 flex flex-wrap items-center justify-between text-[11.5px] text-ink-muted">
        <span>Deterministic Rule Ordering: Storm → Telemetry Loss → Frozen → Spike → Drift</span>
        <span className="font-mono text-ink-faint">Zero Black-Box Latency · 0.2ms Cascade</span>
      </div>
    </div>
  );
}
