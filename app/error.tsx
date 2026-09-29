'use client';

import Link from 'next/link';

/**
 * Route-level error boundary.
 *
 * Previously this project had NO error boundary anywhere, while
 * /dashboard (843 lines) and /mobile (992 lines) both depend on
 * navigator.geolocation, Leaflet, Web Audio, IndexedDB, BroadcastChannel and
 * reconnecting sockets. Any throw in those environments unmounted the route to
 * a blank navy screen with no way back.
 *
 * This boundary catches render/effect/lifecycle throws and offers a retry
 * without a full page reload. For a field device on a flaky link, a retry that
 * does not discard the rest of the app is materially better than a reload.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-6 text-ink">
      <div className="w-full max-w-lg rounded-xl border border-fault/30 bg-card p-6 shadow-lg">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fault">
          Display fault
        </p>
        <h1 className="mt-2 text-xl font-bold text-navy">This view could not render</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          The console hit an unexpected error while drawing. Your data has not been
          affected. Retrying re-runs this view only.
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
            className="rounded-lg bg-sky-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-hairline-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            Operations console
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-hairline-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
