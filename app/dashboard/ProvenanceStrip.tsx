'use client';

import { DATA_MODE, DATA_MODE_STATEMENT } from '@/lib/networkFeed';

/**
 * The provenance strip.
 *
 * This previously read `state.mode` out of `SystemContext`, a field initialised
 * once to the string `'SIMULATED_REPLAY'` and never written again. Nothing set
 * it, so it could not track `DATA_MODE`, and the strip therefore reported a
 * provenance that was not the real one — the exact failure the data-integrity
 * mandate exists to prevent. It now reads `DATA_MODE` directly, so the strip
 * and the engine cannot disagree.
 *
 * The scenario suffix is kept, but it is now genuinely live: it renders only
 * when a scenario has actually been run, and it names the scenario's own label
 * rather than its internal id.
 */
export function ProvenanceStrip({ scenarioLabel }: { scenarioLabel?: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline bg-surface-alt px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
        Data mode: <span className="text-navy">{DATA_MODE}</span>
      </span>
      {scenarioLabel && <span>Scenario: {scenarioLabel}</span>}
      <span className="ml-auto hidden text-ink-faint sm:inline">{DATA_MODE_STATEMENT}</span>
    </div>
  );
}
