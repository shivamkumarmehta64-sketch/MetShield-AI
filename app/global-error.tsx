'use client';

import Link from 'next/link';

/**
 * Global error boundary — the last line of defence.
 *
 * Catches failures that happen in the ROOT layout itself, which a nested
 * app/error.tsx cannot catch: a `next/font/google` fetch failure, a metadata
 * error, or a throw in RootLayout. Without this file Next renders its default
 * unstyled error page.
 *
 * Per the App Router contract this component MUST:
 *   - render its own <html> and <body>
 *   - be a client component
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full flex items-center justify-center bg-[#070d1e] text-[#f8fafc] font-sans p-6"
        style={{
          fontFamily:
            "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0e1730] p-6 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">
            Application fault
          </p>
          <h1 className="mt-2 text-xl font-bold text-white">
            The console failed to start
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            A fault occurred in the root layout, so no page could render. This is
            usually a font or asset loading failure rather than a data problem.
          </p>

          {error.digest && (
            <p className="mt-3 font-mono text-[11px] text-slate-500">
              Trace ID: <span className="text-slate-400">{error.digest}</span>
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#070d1e] transition-colors hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Retry
            </button>
            <Link
              href="/"
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Return to home
            </Link>          </div>
        </main>
      </body>
    </html>
  );
}
