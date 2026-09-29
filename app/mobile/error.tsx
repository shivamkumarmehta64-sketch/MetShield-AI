'use client';

import Link from 'next/link';
import { Satellite, RotateCw, LayoutDashboard, Home } from 'lucide-react';

/**
 * Error boundary for the Mobile Edge Node route.
 *
 * This route touches more optional platform APIs than any other in the app:
 *   navigator.geolocation, navigator.onLine, navigator.vibrate,
 *   window.AudioContext, BroadcastChannel, IndexedDB, sessionStorage, and a
 *   2.5 s telemetry transmit loop.
 *
 * `requestGpsLocation` handled geolocation *rejection*, but a throw from any
 * other API in those effect chains unmounted the entire route to a blank
 * screen. Insecure-context browsers and some in-app webviews are the realistic
 * triggers — a field device on a hospital or government LAN is exactly where
 * `navigator.vibrate` and `AudioContext` tend to be absent.
 *
 * The retry advice is deliberately specific: a retry cannot fix a missing API,
 * so the message says so rather than inviting an endless retry loop.
 */
export default function MobileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || '';

  // A missing platform API will not appear on retry. Tell the operator to stop
  // retrying rather than offering a button that cannot work.
  const platformGap =
    /not a function|undefined is not|is not a function|Permission denied|NotAllowedError|SecurityError/i.test(
      message
    );

  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-6 text-ink">
      <div className="w-full max-w-lg rounded-xl border border-warning/30 bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Satellite className="h-5 w-5 text-warning-text" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning-text">
            Field node fault
          </p>
        </div>

        <h1 className="mt-2 text-xl font-bold text-navy">The field node stopped</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {platformGap
            ? 'A required browser API is unavailable or was denied. This is a device or browser-permission problem, not a transient fault — retrying will not help. Check location permission and whether the page is running in a secure context (HTTPS).'
            : 'The field node hit an unexpected fault while running. Queued observations held in IndexedDB are not lost; they will transmit when connectivity returns.'}
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
            {message}
          </pre>
        </details>

        <div className="mt-5 flex flex-wrap gap-2">
          {!platformGap && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Restart node
            </button>
          )}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-hairline-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Operations command
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-hairline-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
