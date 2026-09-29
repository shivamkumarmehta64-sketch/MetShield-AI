'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Cpu, Info } from 'lucide-react';
import { clsx } from 'clsx';
import {
  getNetworkSnapshot,
  evaluateQcChecks,
  modelMetadata,
  aiConfidenceOf,
  classificationLabel,
  type StationSnapshot,
} from '@/lib/networkFeed';
import WmoFlagBadge from './WmoFlagBadge';

const CHECK_STYLE = {
  PASS: { Icon: CheckCircle2, className: 'text-healthy', label: 'Pass' },
  WARNING: { Icon: AlertTriangle, className: 'text-warning', label: 'Warning' },
  FAIL: { Icon: XCircle, className: 'text-fault', label: 'Fail' },
} as const;

/**
 * §G — rule-based classification.
 *
 * Renamed from "QC & AI". Nothing on this panel is a trained model:
 * `classifyAnomaly` in lib/mlAnomalyModel.ts is a hand-authored if/else chain
 * over rate-of-change and persistence features, and its own source comment
 * says so. Calling that "AI" in a panel next to a WMO quality flag invites the
 * reader to credit a verdict to a model that does not exist, when the verdict
 * in fact came from the thresholds in lib/anomalyLogic.ts.
 *
 * Everything here is read off the engine. The five checks are computed by
 * `evaluateQcChecks`, the card is the engine's own `getModelMetadata()`, and
 * the confidence figure is the engine's `mlConfidence` shown with
 * `calibrated: false` rather than as a bare percent.
 */
export default function QcPanel() {
  const snapshot = getNetworkSnapshot();
  const meta = modelMetadata();
  const [selected, setSelected] = useState<StationSnapshot>(
    snapshot.stations.find((s) => s.health !== 'NOMINAL') ?? snapshot.stations[0]
  );

  const checks = evaluateQcChecks(selected.stationId);
  const confidence = aiConfidenceOf(selected.decidedBy);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
      {/* Station picker */}
      <section className="card overflow-hidden" aria-label="Stations">
        <div className="border-b border-hairline px-4 py-3">
          <h2 className="t-card-title">Station under test</h2>
          <p className="t-meta">{snapshot.stations.length} registered stations</p>
        </div>
        <ul className="max-h-[560px] overflow-y-auto">
          {snapshot.stations.map((st) => (
            <li key={st.stationId}>
              <button
                type="button"
                onClick={() => setSelected(st)}
                aria-current={st.stationId === selected.stationId ? 'true' : undefined}
                className={clsx(
                  'w-full text-left px-4 py-2.5 border-b border-hairline last:border-b-0',
                  st.stationId === selected.stationId
                    ? 'bg-surface-alt'
                    : 'hover:bg-surface-hover'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="t-mono text-[12px] font-semibold text-ink">{st.stationId}</span>
                  <span
                    className="t-label"
                    style={{
                      color:
                        st.health === 'FAULT'
                          ? 'var(--color-fault)'
                          : st.health === 'WEATHER_EVENT'
                            ? 'var(--color-weather)'
                            : st.health === 'DRIFT'
                              ? 'var(--color-warning)'
                              : 'var(--color-healthy)',
                    }}
                  >
                    {st.health === 'NOMINAL' ? 'Good' : st.health.replace('_', ' ')}
                  </span>
                </div>
                <div className="t-meta truncate">{st.name}</div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-5 min-w-0">
        {/* Station verdict */}
        <section className="card p-5" aria-label="Station verdict">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="t-section-title text-navy">{selected.name}</h2>
              <p className="t-meta">
                {selected.hindiName} · {selected.stationId} · {selected.state} ·{' '}
                {selected.rmcDivision} division
              </p>
            </div>
            <WmoFlagBadge flag={selected.wmoFlag} />
          </div>

          <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
            {[
              ['Temperature', `${selected.decidedBy.raw.temperature ?? '—'} °C`],
              ['Pressure', `${selected.decidedBy.raw.pressure ?? '—'} hPa`],
              ['Humidity', `${selected.decidedBy.raw.humidity ?? '—'} %`],
              ['Wind', `${selected.decidedBy.raw.windSpeedKph ?? '—'} km/h`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="t-label">{label}</dt>
                <dd className="t-mono text-[17px] font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 border-t border-hairline pt-4 flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <span className="t-label">Root cause</span>
              <p className="t-card-title">{classificationLabel(selected.classification)}</p>
            </div>
            <div>
              <span className="t-label">Alert level</span>
              <p className="t-card-title">{selected.alertLevel}</p>
            </div>
            <div>
              <span className="t-label">Buffer depth</span>
              <p className="t-card-title font-mono">{selected.historyDepth} ticks</p>
            </div>
            {selected.resolved && (
              <div>
                <span className="t-label">Event status</span>
                <p className="t-card-title text-warning">Recovered — last event retained</p>
              </div>
            )}
          </div>
        </section>

        {/* The five named checks */}
        <section className="card overflow-hidden" aria-label="Quality control checks">
          <div className="border-b border-hairline px-5 py-3">
            <h2 className="t-card-title">Quality control checks</h2>
            <p className="t-meta">
              WMO Pub No. 8 checks evaluated against the packet that decided this station&rsquo;s
              state.
            </p>
          </div>
          <ul>
            {checks.map((c) => {
              const { Icon, className, label } = CHECK_STYLE[c.status];
              return (
                <li key={c.name} className="flex gap-3 px-5 py-3 border-b border-hairline last:border-b-0">
                  <Icon size={18} className={clsx('shrink-0 mt-0.5', className)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="t-card-title">{c.name}</span>
                      <span className={clsx('t-label', className)}>{label}</span>
                    </div>
                    <p className="t-body text-ink-muted">{c.detail}</p>
                    <p className="t-mono text-[11.5px] text-ink-faint mt-0.5">{c.evidence}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Model card — §15 / §11: no unearned accuracy claims */}
        <section className="card p-5" aria-label="Model card">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-ai" aria-hidden />
            <h2 className="t-card-title">Classifier card</h2>
          </div>
          <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="t-label">Model type</dt>
              <dd className="t-body">{meta.kind}</dd>
            </div>
            <div>
              <dt className="t-label">Version</dt>
              <dd className="t-body font-mono">{meta.version}</dd>
            </div>
            <div>
              <dt className="t-label">Basis</dt>
              <dd className="t-body">{meta.basis}</dd>
            </div>
            <div>
              <dt className="t-label">Confidence on this packet</dt>
              <dd className="t-body font-mono">
                {(confidence.value * 100).toFixed(0)}%{' '}
                <span className="text-ink-muted">
                  — rule-cascade agreement score, not a calibrated probability
                  {selected.decidedBy.mlPrediction.agreesWithRules ? '' : ' (this packet disagrees with the rules)'}
                </span>
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="t-label">Precision / Recall / F1</dt>
              <dd className="t-body">
                Not measured — no labelled corpus is bundled, and no accuracy figure is reported
                anywhere in this project.
              </dd>
            </div>
          </dl>
          <p className="t-meta mt-3 flex items-start gap-2 border-t border-hairline pt-3">
            <Info size={14} className="shrink-0 mt-0.5" aria-hidden />
            <span>
              Every figure on this page is computed by the engine from the benchmark pass. Nothing is
              hardcoded, and nothing here is measured against ground truth.
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
