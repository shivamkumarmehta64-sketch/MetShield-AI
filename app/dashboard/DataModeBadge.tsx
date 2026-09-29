'use client';

import { DATA_MODE, DATA_MODE_STATEMENT, type DataMode } from '@/lib/networkFeed';
import { Radio, FlaskConical, RotateCcw, Sparkles } from 'lucide-react';

/**
 * §30 Data Integrity — the badge every data surface is required to render.
 *
 * The rule this enforces: static/pre-baked data is BENCHMARK, a testbench run
 * is REPLAY, generated data is SIMULATED, and only a real endpoint is LIVE.
 * Nothing in this project is LIVE, and this component is what stops the next
 * person from labelling a deterministic seed as live telemetry.
 *
 * The `live` icon is deliberately reserved. Using the pulsing "live" dot for a
 * benchmark run is the exact failure this badge exists to prevent.
 */
const MODE_META: Record<DataMode, { label: string; Icon: typeof Radio; className: string }> = {
  LIVE: { label: 'Live', Icon: Radio, className: 'text-healthy bg-healthy-bg border-healthy-border' },
  BENCHMARK: { label: 'Benchmark', Icon: FlaskConical, className: 'text-telemetry bg-telemetry-bg border-telemetry-border' },
  REPLAY: { label: 'Replay', Icon: RotateCcw, className: 'text-ai bg-ai-bg border-ai-border' },
  SIMULATED: { label: 'Simulated', Icon: Sparkles, className: 'text-ink-muted bg-surface-alt border-hairline' },
};

interface DataModeBadgeProps {
  /** Override for surfaces driving their own run (the testbench renders REPLAY). */
  mode?: DataMode;
  /** Renders the full sentence as a tooltip instead of the short label. */
  withTooltip?: boolean;
  className?: string;
}

export default function DataModeBadge({
  mode = DATA_MODE,
  withTooltip = true,
  className = '',
}: DataModeBadgeProps) {
  const { label, Icon, className: tone } = MODE_META[mode];
  return (
    <span
      className={`t-label inline-flex items-center gap-1.5 rounded px-2 py-1 border ${tone} ${className}`}
      title={withTooltip ? DATA_MODE_STATEMENT : undefined}
    >
      <Icon size={12} strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
}

/** The full sentence, for pages that should state it in prose, not a tooltip. */
export function DataModeStatement({ mode = DATA_MODE }: { mode?: DataMode }) {
  return (
    <p className="t-meta flex items-start gap-2">
      <DataModeBadge mode={mode} withTooltip={false} />
      <span>{DATA_MODE_STATEMENT}</span>
    </p>
  );
}
