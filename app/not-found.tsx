import Link from 'next/link';
import { Compass, ArrowLeft } from 'lucide-react';

/**
 * Branded 404. Previously the project had no not-found.tsx, so a mistyped URL
 * rendered Next's bare default page with no product context and no navigation.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-6 text-ink">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-card p-8 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-surface-alt">
          <Compass className="h-6 w-6 text-ink-muted" aria-hidden="true" />
        </div>

        <p className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink-faint">
          404 · No such station
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy">Route not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          That address does not correspond to a view in this console. If you followed
          a link from an audit report or work order, the station id may have changed.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            Operations console
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-hairline-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
