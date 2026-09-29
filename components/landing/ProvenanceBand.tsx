import Link from 'next/link';
import { DATA_MODE, DATA_MODE_STATEMENT } from '@/lib/networkFeed';
import { DATA_SOURCES, PROVENANCE_DESCRIPTIONS, type Provenance } from '@/lib/dataProvenance';

/**
 * The provenance legend.
 *
 * This section exists because of one rule: nothing simulated may be presented
 * as live. The previous landing page broke that rule in the most expensive
 * possible way — a terminal that appended `RECV: NODE_1042 T:27.44C` on a
 * 400 ms interval from `Math.random()`, under a pulsing dot labelled LIVE.
 * Nothing was being received. That is the kind of thing a technical judge
 * finds in ninety seconds, and once found it colours the reading of everything
 * else on the page.
 *
 * WHY TWO VOCABULARIES, RECONCILED RATHER THAN MERGED
 * --------------------------------------------------
 * The repo has two independent provenance types and they are not the same axis:
 *
 *   Provenance (lib/dataProvenance.ts)  LIVE | DERIVED | SIMULATED
 *       — "where did this number come from?" A measurement from a provider, a
 *         computation from other measurements, or something generated.
 *
 *   DataMode (lib/networkFeed.ts)       LIVE | BENCHMARK | REPLAY | SIMULATED
 *       — "how is the console currently being driven?" It adds two states the
 *         provenance axis has no room for: BENCHMARK is a static fixture, and
 *         REPLAY is a scenario the operator injected on purpose.
 *
 * Collapsing them would lose a real distinction — a benchmark fixture and an
 * injected scenario are both honestly "not live", but they are not the same
 * situation and an operator needs to tell them apart. So both are shown, and
 * the table below maps which sources carry which label rather than inventing a
 * fifth vocabulary.
 */

const PROVENANCE_ORDER: Provenance[] = ['LIVE', 'DERIVED', 'SIMULATED'];

const LEGEND: Array<{ key: Provenance; token: string; fg: string }> = [
  { key: 'LIVE', token: 'LIVE', fg: 'var(--color-healthy-text)' },
  { key: 'DERIVED', token: 'DERIVED', fg: 'var(--color-telemetry-text)' },
  { key: 'SIMULATED', token: 'SIMULATED', fg: 'var(--color-warning-text)' },
];

const DATA_MODE_MEANING: Record<string, string> = {
  LIVE: 'The console is bound to a real upstream endpoint. Not the case anywhere in this build.',
  BENCHMARK: 'Static fixtures generated once at module load by the real engine. Deterministic — the same build produces the same snapshot every time.',
  REPLAY: 'A named scenario is being injected on purpose from the testbench, so the failure paths can be demonstrated.',
  SIMULATED: 'Values are generated rather than measured.',
};

export default function ProvenanceBand() {
  const sources = Object.entries(DATA_SOURCES);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        className="flex flex-wrap items-baseline justify-between gap-2"
        style={{ borderBottom: '1px solid var(--hairline)', padding: '10px 14px', background: 'var(--surface-alt)' }}
      >
        <h3 className="t-card-title">Where every number on this page came from</h3>
        <span className="t-meta t-mono">lib/dataProvenance.ts · DATA_SOURCES</span>
      </div>

      {/* ── The four states, in the words a reader needs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ borderBottom: '1px solid var(--hairline)' }}>
        {LEGEND.map((l) => (
          <div
            key={l.key}
            style={{
              borderRight: '1px solid var(--hairline)',
              padding: '12px 14px',
              borderTop: `2px solid ${l.fg}`,
            }}
          >
            <span className="t-mono" style={{ fontSize: 12, fontWeight: 700, color: l.fg, letterSpacing: '0.08em' }}>
              {l.token}
            </span>
            <p className="t-body" style={{ marginTop: 6, color: 'var(--ink-muted)' }}>{PROVENANCE_DESCRIPTIONS[l.key]}</p>
          </div>
        ))}

        <div style={{ borderTop: '2px solid var(--color-ink)' , padding: '12px 14px' }}>
          <span className="t-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.08em' }}>
            {DATA_MODE}
          </span>
          <p className="t-body" style={{ marginTop: 6, color: 'var(--ink-muted)' }}>
            {DATA_MODE_STATEMENT}
          </p>
        </div>
      </div>

      {/* ── The current mode, stated in a full sentence ── */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)', background: 'var(--surface-alt)' }}>
        <p className="t-body" style={{ maxWidth: '80ch' }}>
          <strong>The console is running in {DATA_MODE} mode.</strong>{' '}
          {DATA_MODE_MEANING[DATA_MODE]}
        </p>
      </div>

      {/* ── Every source, with its label ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <caption className="sr-only">Every named data source in this build, with its provenance label and description</caption>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline-strong)' }}>
              <th scope="col" className="t-label" style={{ textAlign: 'left', padding: '8px 14px' }}>Source</th>
              <th scope="col" className="t-label" style={{ textAlign: 'left', padding: '8px 14px' }}>Label</th>
              <th scope="col" className="t-label" style={{ textAlign: 'left', padding: '8px 14px' }}>What it actually is</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(([id, src]) => {
              const order = PROVENANCE_ORDER.indexOf(src.provenance);
              const fg =
                src.provenance === 'LIVE'
                  ? 'var(--color-healthy-text)'
                  : src.provenance === 'DERIVED'
                    ? 'var(--color-telemetry-text)'
                    : 'var(--color-warning-text)';
              return (
                <tr key={id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                  <td className="t-mono" style={{ padding: '7px 14px', fontSize: 11.5, whiteSpace: 'nowrap' }}>{src.label}</td>
                  <td style={{ padding: '7px 14px' }}>
                    <span
                      className="t-mono"
                      style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', color: fg }}
                      data-order={order}
                    >
                      {src.provenance}
                    </span>
                  </td>
                  <td className="t-body" style={{ padding: '7px 14px', color: 'var(--ink-muted)' }}>{src.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '11px 14px', background: 'var(--surface-alt)', borderTop: '1px solid var(--hairline)' }}>
        <p className="t-meta" style={{ maxWidth: '80ch' }}>
          Two of the twelve sources are marked LIVE and neither is reachable in this build: the IMD official feed has no
          public API, and the Open-Meteo lookup is only used by the per-station endpoint on demand. Every figure in the
          operations band above is BENCHMARK — real engine output over a deterministic fixture, not a measurement of the
          atmosphere. Replacing a fixture with a live endpoint is a one-line change in that table, and this legend is what
          makes that change visible when it happens.
        </p>
        <p className="t-meta" style={{ marginTop: 8, maxWidth: '80ch' }}>
          Integrity checks are named in the same spirit: the packet seal is an unkeyed 32-bit FNV-1a checksum that detects
          a truncated write and nothing more. It is not HMAC, not a Merkle root, and it does not resist an attacker — see{' '}
          <Link href="/audit-report" style={{ color: 'var(--color-telemetry-text)' }}>/audit-report</Link>.
        </p>
      </div>
    </div>
  );
}
