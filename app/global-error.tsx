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
 *
 * Tokens from globals.css are not loaded here (the root layout never mounted),
 * so the palette is inlined from the same values as `:root` in globals.css.
 * Do not invent a second palette — these hexes are the light console tokens.
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
        className="min-h-full flex items-center justify-center p-6"
        style={{
          background: '#F8FAFC',
          color: '#0F172A',
          fontFamily:
            "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main
          className="w-full max-w-lg rounded-xl p-6"
          style={{
            background: '#FFFFFF',
            border: '1px solid #FECACA',
            boxShadow: '0 4px 16px rgb(11 31 58 / 0.08)',
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: '#DC2626' }}
          >
            Application fault
          </p>
          <h1 className="mt-2 text-xl font-bold" style={{ color: '#0B1F3A' }}>
            The console failed to start
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#475569' }}>
            A fault occurred in the root layout, so no page could render. This is
            usually a font or asset loading failure rather than a data problem.
          </p>

          {error.digest && (
            <p className="mt-3 font-mono text-[11px]" style={{ color: '#64748B' }}>
              Trace ID: <span style={{ color: '#475569' }}>{error.digest}</span>
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={{ background: '#0EA5E9', color: '#FFFFFF' }}
            >
              Retry
            </button>
            <Link
              href="/"
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={{
                border: '1px solid #E2E8F0',
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              Return to home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
