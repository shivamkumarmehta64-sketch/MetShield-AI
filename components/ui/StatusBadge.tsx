import React from 'react';
import { WMOQualityFlag } from '@/lib/anomalyLogic';

const BADGE_MAP: Record<WMOQualityFlag | 'UNKNOWN', { fill: string; ink: string; label: string; bg: string }> = {
  FLAG_1_VERIFIED_GOOD:    { fill: 'var(--status-nominal)', ink: 'var(--status-nominal-ink)', bg: 'var(--status-nominal-bg)', label: 'Nominal' },
  FLAG_2_CONVECTIVE_STORM: { fill: 'var(--status-watch)', ink: 'var(--status-watch-ink)', bg: 'var(--status-watch-bg)', label: 'Storm' },
  FLAG_3_SUSPECT_DRIFT:    { fill: 'var(--status-serious)', ink: 'var(--status-serious-ink)', bg: 'var(--status-serious-bg)', label: 'Drift' },
  FLAG_4_CORRUPT_HARDWARE: { fill: 'var(--status-critical)', ink: 'var(--status-critical-ink)', bg: 'var(--status-critical-bg)', label: 'Fault' },
  FLAG_5_PACKET_LOSS:      { fill: 'var(--status-lost)', ink: 'var(--status-lost-ink)', bg: 'var(--status-lost-bg)', label: 'Packet Loss' },
  UNKNOWN:                 { fill: 'var(--text-muted)', ink: 'var(--text-secondary)', bg: 'var(--surface-sunken)', label: 'Standby' },
};

export function StatusBadge({ flag, labelOverwrite }: { flag: WMOQualityFlag | 'UNKNOWN', labelOverwrite?: string }) {
  const meta = BADGE_MAP[flag] ?? BADGE_MAP.UNKNOWN;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border"
      style={{ backgroundColor: meta.bg, color: meta.ink, borderColor: meta.fill }}
    >
      {/* Colour is never the only channel — the dot is paired with a text label. */}
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.fill }} aria-hidden="true" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{labelOverwrite || meta.label}</span>
    </span>
  );
}
