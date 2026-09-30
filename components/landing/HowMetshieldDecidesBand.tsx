'use client';

import React from 'react';
import { ArrowRight, Eye, ShieldCheck, Cpu, GitFork, FileText, CheckCircle2 } from 'lucide-react';

interface PipelineStep {
  index: string;
  name: string;
  rule: string;
  detail: string;
  Icon: typeof Eye;
  outcome: string;
}

const STEPS: PipelineStep[] = [
  {
    index: '01',
    name: 'OBSERVE',
    rule: 'AWS Telemetry Ingestion',
    detail: '5 channels (T, P, RH, W, Rain) per 2.5s cycle with per-station PSK authentication.',
    Icon: Eye,
    outcome: 'Authenticated Ingest',
  },
  {
    index: '02',
    name: 'VALIDATE',
    rule: 'Range & Data Integrity',
    detail: 'WMO-No. 8 physical plausibility limits (−90..70°C, 600..1100 hPa, 0..100% RH).',
    Icon: ShieldCheck,
    outcome: 'Bounds Verified',
  },
  {
    index: '03',
    name: 'ANALYSE',
    rule: 'Physical & Temporal Behaviour',
    detail: 'Evaluate temporal step-jumps |dX/dt| and probe freezes (variance < 1e-5 over 6 cycles).',
    Icon: Cpu,
    outcome: 'Rates Computed',
  },
  {
    index: '04',
    name: 'DISTINGUISH',
    rule: 'Weather Event vs Sensor Fault',
    detail: 'Coupled ΔP ≤ −2.5 hPa ∧ ΔRH ≥ +15% isolates storms from isolated hardware spikes.',
    Icon: GitFork,
    outcome: 'Event Separated',
  },
  {
    index: '05',
    name: 'EXPLAIN',
    rule: 'Rule-Based QC Reasoning',
    detail: 'Deterministic cascade: Storm → Telemetry Loss → Freeze → Spike → Drift.',
    Icon: FileText,
    outcome: 'Explainable Rule Match',
  },
  {
    index: '06',
    name: 'ACT',
    rule: 'Accept / Quarantine / Work Order',
    detail: 'FLAG_1 & 2 validated for NWP assimilation. FLAG_3, 4, 5 quarantined with ticket dispatch.',
    Icon: CheckCircle2,
    outcome: 'NWP Stream or Ticket',
  },
];

export default function HowMetshieldDecidesBand() {
  return (
    <div className="card overflow-hidden border border-hairline bg-card shadow-sm">
      <div className="border-b border-hairline bg-surface-alt px-5 py-3.5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="t-card-title text-navy">HOW METSHIELD DECIDES</h3>
          <p className="t-meta text-ink-muted">
            The 6-stage deterministic pipeline. Strict execution order guarantees genuine storms are never quarantined as faults.
          </p>
        </div>
        <span className="t-label font-mono text-[10.5px] px-2 py-0.5 rounded bg-card border border-hairline text-ink-muted">
          ALIGNED WITH APPLICABLE WMO-NO. 8 GUIDANCE
        </span>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {STEPS.map((step, idx) => (
            <div
              key={step.index}
              className="relative p-3.5 rounded-lg border border-hairline bg-surface-alt flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline">
                  <span className="t-mono font-bold text-xs text-sky-deep">{step.index}</span>
                  <step.Icon size={15} className="text-ink-muted" aria-hidden />
                </div>
                <div className="font-bold text-xs text-navy tracking-wide mb-1">{step.name}</div>
                <div className="t-mono text-[11px] font-semibold text-ink mb-1.5 leading-snug">{step.rule}</div>
                <p className="text-[11.5px] text-ink-muted leading-relaxed">{step.detail}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-hairline flex items-center justify-between">
                <span className="t-label font-mono text-[10px] text-sky-deep truncate">{step.outcome}</span>
                {idx < STEPS.length - 1 && (
                  <ArrowRight size={12} className="text-hairline-strong hidden lg:block -mr-1" aria-hidden />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-hairline bg-surface-alt px-5 py-2.5 flex flex-wrap items-center justify-between text-[11px] text-ink-muted font-mono">
        <span>Deterministic Rule Ordering: Storm → Loss → Frozen → Spike → Drift (First match wins)</span>
        <span className="text-sky-deep font-semibold">Zero Unverified Models · Verifiable by Audit</span>
      </div>
    </div>
  );
}
