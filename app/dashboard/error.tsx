'use client';

import Link from 'next/link';
import { AlertTriangle, RotateCw, LayoutDashboard, Smartphone } from 'lucide-react';

/**
 * Error boundary for the National Operations Command route.
 *
 * This route aggregates 26 child components including four Leaflet map
 * variants, a 2.5 s telemetry ingest loop over 710 districts, a Web Audio
 * chime, and a BroadcastChannel listener fed by /mobile. Leaflet initialisation
 * and container sizing are the classic client-side throw sources — a
 * zero-height container or a failed tile load will take down the whole route
 * without this boundary.
 *
 * A retry here re-runs the route without a full reload, which matters when the
 * failure was transient (a dropped socket, a map tile CDN hiccup).
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-6 text-ink">
      <div className="w-full max-w-lg rounded-xl border border-warning/30 bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning-text" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning-text">
            Operations console fault
          </p>
        </div>

        <h1 className="mt-2 text-xl font-bold text-navy">
          The operations console stopped rendering
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          A component on this screen threw during render. Common causes on this route are
          a map tile failure, a zero-size chart container, or a dropped telemetry
          socket. No observations were altered.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-ink-faint">
            Trace ID: <span className="text-ink-muted">{error.digest}</span>
          </p>
        )}

        <details className="mt-3 rounded-lg border border-hairline bg-surface-alt p-2">
          <summary className="cursor-pointer text-[11px] text-ink-muted">
            Technical detail
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-ink-faint">
            {error.message}
          </pre>
        </details>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Retry console
          </button>
          <Link
            href="/mobile"
            className="inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-hairline-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Field node
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-hairline-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
