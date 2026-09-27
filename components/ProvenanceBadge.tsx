'use client';

import type { Provenance, DataSourceId } from '@/lib/dataProvenance';
import {
  PROVENANCE_LABELS,
  PROVENANCE_DESCRIPTIONS,
  DATA_SOURCES,
} from '@/lib/dataProvenance';

/**
 * Provenance presentation components.
 *
 * Deliberately dependency-free (no framer-motion, no icon library) so they can
 * be dropped into any surface — including the light-theme /audit-report route —
 * without pulling in client weight or dragging a dark palette along.
 *
 * Both components are accessible: the badge exposes its state via text, not
 * colour alone, and the banner is a live region.
 */

const STYLES: Record<Provenance, string> = {
  LIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  DERIVED: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  SIMULATED: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
};

const DOT: Record<Provenance, string> = {
  LIVE: 'bg-emerald-400',
  DERIVED: 'bg-sky-400',
  SIMULATED: 'bg-amber-400',
};

export interface ProvenanceBadgeProps {
  provenance: Provenance;
  /** Overrides the default label, e.g. "Demo telemetry". */
  label?: string;
  className?: string;
}

/**
 * A compact inline marker. Put this directly next to any number that is not a
 * real measurement.
 *
 * <ProvenanceBadge provenance="SIMULATED" label="Demo telemetry" />
 */
export function ProvenanceBadge({ provenance, label, className = '' }: ProvenanceBadgeProps) {
  const text = label ?? PROVENANCE_LABELS[provenance];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[provenance]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[provenance]}`} aria-hidden="true" />
      {text}
    </span>
  );
}

export interface SimulatedBannerProps {
  /** Data-source id from DATA_SOURCES, used to pull the detail copy. */
  source?: DataSourceId;
  /** Overrides the whole banner message. */
  message?: string;
  /** Light surfaces (print / audit report) need inverted colours. */
  tone?: 'dark' | 'light';
  className?: string;
}

/**
 * A page-level notice explaining that a whole surface is simulated.
 *
 * Use this at the top of any view whose primary content is synthetic, so a
 * reviewer cannot mistake the surface for a live operational feed.
 */
export function SimulatedBanner({
  source,
  message,
  tone = 'dark',
  className = '',
}: SimulatedBannerProps) {
  const entry = source ? DATA_SOURCES[source] : null;
  const body =
    message ??
    entry?.detail ??
    'Generated for demonstration. Not a real measurement and not suitable for operational use.';

  const shell =
    tone === 'dark'
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
      : 'bg-amber-50 border-amber-400 text-amber-900';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-relaxed ${shell} ${className}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 shrink-0 rounded-full border border-current px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      >
        Demo
      </span>
      <div>
        <p className="font-semibold">
          {entry ? `${entry.label} — simulated data` : 'Simulated data'}
        </p>
        <p className="mt-0.5 opacity-90">{body}</p>
      </div>
    </div>
  );
}

export interface ProvenanceLegendProps {
  sources: DataSourceId[];
  tone?: 'dark' | 'light';
  className?: string;
}

/**
 * An explicit key for a multi-source view, so a reader can tell at a glance
 * which chips on the screen are measured and which are generated.
 */
export function ProvenanceLegend({ sources, tone = 'dark', className = '' }: ProvenanceLegendProps) {
  const heading = tone === 'dark' ? 'text-slate-400' : 'text-slate-600';
  return (
    <section className={className} aria-label="Data provenance legend">
      <h2 className={`text-[10px] font-semibold uppercase tracking-widest ${heading}`}>
        Data provenance
      </h2>
      <ul className="mt-2 space-y-1.5">
        {sources.map((id) => {
          const s = DATA_SOURCES[id];
          return (
            <li key={id} className="flex items-start gap-2 text-xs">
              <ProvenanceBadge provenance={s.provenance} label={s.label} className="shrink-0" />
              <span className={tone === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                {PROVENANCE_DESCRIPTIONS[s.provenance]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
