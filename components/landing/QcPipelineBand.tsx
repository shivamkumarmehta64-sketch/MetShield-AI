import Link from 'next/link';

/**
 * "How MetShield QC decides" — the seven-stage chain, as instrument cells.
 *
 * EVERY THRESHOLD IN `rule` IS LITERALLY COPIED FROM lib/anomalyLogic.ts
 * ----------------------------------------------------------------------
 * These strings are not illustrations. Each one is the comparison the engine
 * actually performs, transcribed so a reader can check it against the code.
 * That is the whole reason this section exists: the strongest asset in this
 * repository is the rule set, and a diagram that paraphrases it would be both
 * less interesting and less honest. If a threshold changes in
 * `evaluate()`, it must change here in the same commit.
 *
 * The one stage that is NOT in the verdict path is marked as such rather than
 * quietly drawn as active. See SPATIAL_VALIDATION below.
 */

interface Stage {
  index: number;
  name: string;
  /** The literal comparison, in the engine's own arithmetic. */
  rule: string;
  note: string;
  /**
   * True when this stage is implemented but not yet called from
   * `evaluate()`. Rendered muted with an explicit note — a diagram that shows
   * an unwired stage as running is the same class of lie this project spent
   * three tiers removing.
   */
  notWired?: boolean;
}

const STAGES: Stage[] = [
  {
    index: 1,
    name: 'AWS TELEMETRY',
    rule: 'T, P, RH, wind, rainfall → 5 channels',
    note: 'One packet per observation, stamped in IST and UTC. The POST /api/telemetry route requires a per-station pre-shared key before a packet enters the engine at all.',
  },
  {
    index: 2,
    name: 'VALIDATION',
    rule: '600 ≤ P ≤ 1100 hPa · −90 ≤ T ≤ 70 °C · 0 ≤ RH ≤ 100 %',
    note: 'Out-of-range values are rejected to null at the route boundary rather than being allowed to reach a physical rule as impossible numbers.',
  },
  {
    index: 3,
    name: 'PHYSICAL CONSISTENCY',
    rule: 'ΔP ≤ −2.5 hPa  AND  ΔRH ≥ +15 %',
    note: 'A barometer does not fall 2.5 hPa without the humidity rising. Both halves, or the storm rule does not fire.',
  },
  {
    index: 4,
    name: 'TEMPORAL ANALYSIS',
    rule: 'frozen: variance < 1e-5 over 6 packets · drift: |offset| > 2.0 hPa',
    note: 'Six consecutive identical readings are a stuck register, not calm weather. Drift is the station’s accumulated barometric offset against its calibrated baseline.',
  },
  {
    index: 5,
    name: 'SPATIAL VALIDATION',
    rule: '3 nearest stations within 500 km · ≥ 2 anomalous → REGIONAL_WEATHER',
    note: 'A fault is local; weather is not. This is what separates one sick station from a genuine regional signal.',
    notWired: true,
  },
  {
    index: 6,
    name: 'QC DECISION',
    rule: 'storm → loss → frozen → spike → drift, first match wins',
    note: 'A single ordered cascade, not a scored ensemble. This ordering is the design: a real storm is never re-flagged as a hardware fault, which is the false positive that costs a forecaster an event.',
  },
  {
    index: 7,
    name: 'WORK ORDER / ACCEPTED',
    rule: 'FLAG_2 validated for NWP · FLAG_1 accepted · FLAG_3/4/5 quarantined',
    note: 'The outcome is either a validated observation for the assimilation stream, or a ticket against a named station and a named parameter.',
  },
];

export default function QcPipelineBand() {
  return (
    <div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          className="flex flex-wrap items-baseline justify-between gap-2"
          style={{ borderBottom: '1px solid var(--hairline)', padding: '10px 14px', background: 'var(--surface-alt)' }}
        >
          <h3 className="t-card-title">Decision chain, in execution order</h3>
          <span className="t-meta t-mono">transcribed from lib/anomalyLogic.ts · evaluate()</span>
        </div>

        {/* Horizontal on desktop, vertical on small screens. The chain IS a
            sequence, which is the one case where a numbered marker is
            carrying information rather than decorating. */}
        <ol
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          {STAGES.map((s) => (
            <li
              key={s.index}
              className={s.notWired ? 'pipe-cell is-open' : 'pipe-cell'}
              style={{ border: 'none', borderRight: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}
            >
              <div className="pipe-index">{String(s.index).padStart(2, '0')}</div>
              <div className="pipe-name" style={{ color: s.notWired ? 'var(--ink-muted)' : 'var(--ink)' }}>
                {s.name}
              </div>
              <div
                className="pipe-rule"
                style={s.notWired ? { color: 'var(--ink-faint)', textDecoration: 'line-through' } : undefined}
              >
                {s.rule}
              </div>
              <p className="pipe-note">{s.note}</p>
              {s.notWired && (
                <p
                  className="pipe-note"
                  style={{
                    marginTop: 7,
                    paddingTop: 6,
                    borderTop: '1px dashed var(--color-hairline-strong)',
                    color: 'var(--color-warning-text)',
                    fontWeight: 600,
                  }}
                >
                  Implemented but not yet called from evaluate(). No packet currently carries a spatial verdict.
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* ── The distinction the engine exists to make ── */}
      <div className="card" style={{ marginTop: 16, overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid var(--hairline)', padding: '10px 14px', background: 'var(--surface-alt)' }}>
          <h3 className="t-card-title">Why the storm test is a conjunction</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Weather */}
          <div style={{ borderRight: '1px solid var(--hairline)', padding: '13px 14px' }}>
            <div className="flex items-baseline gap-2">
              <span
                className="t-mono"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-telemetry-text)' }}
              >
                GENUINE_CONVECTIVE_EVENT
              </span>
              <span className="t-label">FLAG_2</span>
            </div>
            <p className="t-body" style={{ marginTop: 7, color: 'var(--ink-muted)' }}>
              Pressure falls, humidity rises, temperature drops — together, in the same packet. Three channels moving in
              the direction the atmosphere requires is a physical constraint, and no single failing sensor can fake all
              three in agreement.
            </p>
            <dl className="t-mono" style={{ margin: '10px 0 0', fontSize: 11.5, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 14px' }}>
              <dt style={{ color: 'var(--color-telemetry-text)' }}>ΔP</dt>
              <dd style={{ margin: 0 }}>≤ −2.5 hPa</dd>
              <dt style={{ color: 'var(--color-telemetry-text)' }}>ΔRH</dt>
              <dd style={{ margin: 0 }}>≥ +15 %</dd>
              <dt style={{ color: 'var(--color-telemetry-text)' }}>ΔT</dt>
              <dd style={{ margin: 0 }}>≤ −1.5 °C</dd>
            </dl>
            <p className="t-body" style={{ marginTop: 10, color: 'var(--ink-muted)' }}>
              Outcome: <strong style={{ color: 'var(--ink)' }}>validated for NWP assimilation</strong>. The observation is
              kept. Nothing is sent to a technician.
            </p>
          </div>

          {/* Fault */}
          <div style={{ padding: '13px 14px' }}>
            <div className="flex items-baseline gap-2">
              <span
                className="t-mono"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-fault-text)' }}
              >
                SENSOR_SPIKE · FROZEN_VALUE · CALIBRATION_DRIFT
              </span>
              <span className="t-label">FLAG_4 / 3 / 5</span>
            </div>
            <p className="t-body" style={{ marginTop: 7, color: 'var(--ink-muted)' }}>
              One channel moves while its companions stay flat. A thermistor cannot read 50 °C and leave the barometer
              untouched; a barometer cannot walk 2 hPa off zero while the humidity sensor holds steady.
            </p>
            <dl className="t-mono" style={{ margin: '10px 0 0', fontSize: 11.5, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 14px' }}>
              <dt style={{ color: 'var(--color-fault-text)' }}>spike</dt>
              <dd style={{ margin: 0 }}>T &gt; 50 °C or |ΔT| &gt; 8 °C</dd>
              <dt style={{ color: 'var(--color-fault-text)' }}>frozen</dt>
              <dd style={{ margin: 0 }}>variance &lt; 1e-5 × 6 packets</dd>
              <dt style={{ color: 'var(--color-fault-text)' }}>drift</dt>
              <dd style={{ margin: 0 }}>|offset| &gt; 2.0 hPa</dd>
            </dl>
            <p className="t-body" style={{ marginTop: 10, color: 'var(--ink-muted)' }}>
              Outcome: <strong style={{ color: 'var(--ink)' }}>quarantined, with a work order</strong> naming the station
              and the parameter. The reading is held out of the assimilation stream.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--hairline)', padding: '10px 14px', background: 'var(--surface-alt)' }}>
          <p className="t-meta" style={{ maxWidth: '78ch' }}>
            The fault probability shown alongside each verdict is a fixed per-branch constant in the source, not a
            computed model — see <Link href="/dashboard?tab=qc" style={{ color: 'var(--color-telemetry-text)' }}>the model card in the console</Link>,
            which states this from the engine itself.
          </p>
        </div>
      </div>
    </div>
  );
}
