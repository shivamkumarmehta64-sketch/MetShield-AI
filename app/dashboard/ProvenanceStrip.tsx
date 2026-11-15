'use client';

import { useSystem } from './SystemContext';

/**
 * The provenance strip.
 *
 * Reads directly from `SystemContext`'s active `NetworkSnapshot` so the strip
 * reflects whether the console is currently displaying the deterministic
 * BENCHMARK seed, LIVE Open-Meteo NWP observations, or a scenario REPLAY.
 */
export function ProvenanceStrip({ scenarioLabel }: { scenarioLabel?: string | null }) {
  const { state } = useSystem();
  const { dataMode, statement } = state.snapshot;
  const dotClass =
    dataMode === 'LIVE'
      ? 'bg-healthy'
      : dataMode === 'REPLAY'
      ? 'bg-ai'
      : 'bg-warning';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline bg-surface-alt px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
        Data mode: <span className="text-navy">{dataMode}</span>
      </span>
      {scenarioLabel && <span>Scenario: {scenarioLabel}</span>}
      <span className="ml-auto hidden text-ink-faint sm:inline">{statement}</span>
    </div>
  );
}
