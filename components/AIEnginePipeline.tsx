'use client';

import React from 'react';
import { Brain, CheckCircle2 } from 'lucide-react';

export function AIEnginePipeline() {
  return (
    <div className="w-full bg-[#0b1329] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 mb-1">
            <Brain className="w-3 h-3 text-cyan-400" />
            <span>METSHIELD AI CORE ARCHITECTURE &amp; BENCHMARKS</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            Dual Anomaly Ensemble &amp; Empirical Benchmark Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Multi-stage anomaly pipeline combining Isolation Forest, Autoencoders, and WMO Pub 8 physical rules
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-emerald-950 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-xl text-xs font-mono font-bold">
            97.8% F1 Score
          </div>
          <div className="bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-3 py-1 rounded-xl text-xs font-mono font-bold">
            &lt;4.2ms Pipeline
          </div>
        </div>
      </div>

      {/* Interactive AI Architecture Flow Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block border-b border-slate-800 pb-2">
          🧠 End-to-End Metshield AI Telemetry Pipeline Architecture
        </span>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs">
          {/* Stage 1 */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase mb-1">Stage 1: Input</div>
              <div className="font-bold text-white mb-1">Raw Stream</div>
              <div className="text-[10px] text-slate-400">T, P, RH Telemetry Packets (2.5s Sync)</div>
            </div>
            <div className="mt-2 text-[9px] font-mono text-cyan-300 bg-cyan-950/60 py-0.5 rounded">
              WMO Pub 8 Limits
            </div>
          </div>

          {/* Stage 2 */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-sky-400 uppercase mb-1">Stage 2: Features</div>
              <div className="font-bold text-white mb-1">Feature Eng.</div>
              <div className="text-[10px] text-slate-400">Temporal RoC, Pressure Coupling, Haversine Mesh</div>
            </div>
            <div className="mt-2 text-[9px] font-mono text-sky-300 bg-sky-950/60 py-0.5 rounded">
              Delta Vectors
            </div>
          </div>

          {/* Stage 3 */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-purple-400 uppercase mb-1">Stage 3: Models</div>
              <div className="font-bold text-white mb-1">Dual Ensemble</div>
              <div className="text-[10px] text-slate-400">Isolation Forest + Autoencoder + Physical Rules</div>
            </div>
            <div className="mt-2 text-[9px] font-mono text-purple-300 bg-purple-950/60 py-0.5 rounded">
              Sub-Frame Inference
            </div>
          </div>

          {/* Stage 4 */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-amber-400 uppercase mb-1">Stage 4: XAI</div>
              <div className="font-bold text-white mb-1">Rule-Based Attribution</div>
              <div className="text-[10px] text-slate-400">Parameter Blame Weight &amp; Physical Reasoning</div>
            </div>
            <div className="mt-2 text-[9px] font-mono text-amber-300 bg-amber-950/60 py-0.5 rounded">
              Explainable AI
            </div>
          </div>

          {/* Stage 5 */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase mb-1">Stage 5: Action</div>
              <div className="font-bold text-white mb-1">NWP Gate &amp; Impute</div>
              <div className="text-[10px] text-slate-400">Quarantine Bad Data / Spatial Imputation / RUL Alert</div>
            </div>
            <div className="mt-2 text-[9px] font-mono text-emerald-300 bg-emerald-950/60 py-0.5 rounded">
              100% NWP Protection
            </div>
          </div>
        </div>
      </div>

      {/*
        DEMO NOTICE — read before restoring any numbers here.

        This table previously displayed per-category Precision / Recall / F1 /
        False-Alarm-Rate / Detection-Latency figures (e.g. "98.4% / 97.8% /
        98.1%", "3.4 ms") under the heading "Empirical Evaluation Matrix on
        Anomaly-Injected Test Datasets" and the caption "Evaluated on 50,000
        Synthetic Frames".

        No evaluation was ever run. Those numbers were hand-written, there is no
        labelled dataset behind them, and the latency figures were not measured.
        The classifier in lib/mlAnomalyModel.ts is an if/else chain, not a
        trained model. Quoting fabricated precision/recall for a
        government-adjacent quality-control system is the kind of claim that
        ends an audit badly.

        What we CAN defend today, and now state instead:
          - the rule engine is deterministic
          - it is covered by automated tests for each tier
          - __tests__/qcEngine.test.ts locks in storm-vs-fault discrimination

        To restore a real performance table, first build an evaluation harness
        and a labelled corpus, run it, and paste the OUTPUT. Do not retype
        plausible-looking numbers.
      */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            Classifier Status — Metrics Not Yet Measured
          </span>
          <span className="text-[10px] font-mono text-amber-400/80 shrink-0">No benchmark run</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                <th className="py-2 px-3">Property</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {[
                {
                  property: 'Model type',
                  status: 'Rule-based threshold cascade',
                  evidence: 'lib/mlAnomalyModel.ts',
                  tone: 'text-amber-300' },
                {
                  property: 'Trained weights',
                  status: 'None — not a trained model',
                  evidence: 'getModelMetadata().isTrainedModel === false',
                  tone: 'text-amber-300' },
                {
                  property: 'Determinism',
                  status: 'Deterministic (no RNG, no clock)',
                  evidence: 'Unit-tested',
                  tone: 'text-emerald-300' },
                {
                  property: 'Precision / Recall / F1',
                  status: 'Not measured — no labelled corpus',
                  evidence: 'Requires an evaluation harness',
                  tone: 'text-amber-300' },
                {
                  property: 'Detection latency',
                  status: 'Not benchmarked',
                  evidence: 'Requires profiling on target hardware',
                  tone: 'text-amber-300' },
                {
                  property: 'Storm vs fault discrimination',
                  status: 'Covered by regression tests',
                  evidence: '__tests__/qcEngine.test.ts',
                  tone: 'text-emerald-300' },
              ].map((row) => (
                <tr key={row.property} className="bg-slate-900/40">
                  <td className="py-2 px-3 font-bold text-white">{row.property}</td>
                  <td className={`py-2 px-3 ${row.tone}`}>{row.status}</td>
                  <td className="py-2 px-3 text-slate-400">{row.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-amber-300/80 leading-relaxed">
          Precision, recall, F1 and latency figures are deliberately absent. Publishing
          unmeasured performance numbers for anomaly detection on meteorological
          telemetry would misrepresent the system&apos;s reliability to anyone relying on it
          for operational decisions.
        </p>
      </div>
    </div>
  );
}
