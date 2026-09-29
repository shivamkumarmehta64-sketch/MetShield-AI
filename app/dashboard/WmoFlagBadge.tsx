'use client';

import {
  CheckCircle2,
  CloudLightning,
  TrendingDown,
  AlertOctagon,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { WMOQualityFlag } from '@/lib/anomalyLogic';

/**
 * WMO Pub No. 8 quality flags.
 *
 * §E / §23: status is never carried by colour alone. Every rendering of this
 * badge pairs the colour with an icon, a flag number and a written name, and
 * exposes the full definition as a tooltip for assistive tech.
 */
const FLAG_META: Record<
  WMOQualityFlag,
  { short: string; name: string; meaning: string; Icon: LucideIcon; className: string }
> = {
  FLAG_1_VERIFIED_GOOD: {
    short: 'Flag 1',
    name: 'Verified Good',
    meaning: 'Observation passed every quality-control check. Approved for downstream use.',
    Icon: CheckCircle2,
    className: 'text-healthy bg-healthy-bg border-healthy-border',
  },
  FLAG_2_CONVECTIVE_STORM: {
    short: 'Flag 2',
    name: 'Convective Storm',
    meaning:
      'Rapid pressure fall coupled to humidity saturation and a temperature fall. Meteorologically valid — a real event, not an instrument fault.',
    Icon: CloudLightning,
    className: 'text-weather bg-weather-bg border-weather-border',
  },
  FLAG_3_SUSPECT_DRIFT: {
    short: 'Flag 3',
    name: 'Suspect Drift',
    meaning:
      'Sustained monotonic deviation beyond the calibration tolerance. The station is still reporting, but the reading is drifting.',
    Icon: TrendingDown,
    className: 'text-warning bg-warning-bg border-warning-border',
  },
  FLAG_4_CORRUPT_HARDWARE: {
    short: 'Flag 4',
    name: 'Corrupt / Hardware',
    meaning:
      'Observation failed a physical plausibility or persistence check. Quarantined from downstream assimilation.',
    Icon: AlertOctagon,
    className: 'text-fault bg-fault-bg border-fault-border',
  },
  FLAG_5_PACKET_LOSS: {
    short: 'Flag 5',
    name: 'Packet Loss',
    meaning:
      'Telemetry link failure — frames arrived with null channels. A communications problem, not a sensor problem.',
    Icon: WifiOff,
    className: 'text-ink-muted bg-surface-alt border-hairline-strong',
  },
};

export function wmoFlagMeta(flag: WMOQualityFlag) {
  return FLAG_META[flag];
}

/** Short label for dense contexts, e.g. the map legend. */
export function wmoFlagLabel(flag: WMOQualityFlag): string {
  return `${FLAG_META[flag].short} · ${FLAG_META[flag].name}`;
}

interface WmoFlagBadgeProps {
  flag: WMOQualityFlag;
  /** Adds the written name next to the flag number. */
  showName?: boolean;
  className?: string;
}

export default function WmoFlagBadge({ flag, showName = true, className }: WmoFlagBadgeProps) {
  const { short, name, meaning, Icon, className: tone } = FLAG_META[flag];
  return (
    <span
      className={clsx(
        't-label inline-flex items-center gap-1.5 rounded border px-2 py-1',
        tone,
        className
      )}
      title={`${short} — ${name}. ${meaning}`}
    >
      <Icon size={12} strokeWidth={2} aria-hidden />
      {short}
      {showName && <span className="font-sans normal-case tracking-normal">{name}</span>}
      <span className="sr-only">{meaning}</span>
    </span>
  );
}
