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
    <main className="flex min-h-screen items-center justify-center bg-[#070d1e] p-6 text-slate-200">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0e1730] p-6 shadow-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">
          Display fault
        </p>
        <h1 className="mt-2 text-xl font-bold text-white">This view could not render</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          The console hit an unexpected error while drawing. Your data has not been
          affected. Retrying re-runs this view only.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-slate-500">
            Trace ID: <span className="text-slate-400">{error.digest}</span>
          </p>
        )}

        <details className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 p-2">
          <summary className="cursor-pointer text-[11px] text-slate-400">
            Technical detail
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-slate-500">
            {error.message}
          </pre>
        </details>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#070d1e] transition-colors hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Operations command
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
