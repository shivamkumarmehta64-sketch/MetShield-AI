import Link from 'next/link';
import { Compass, ArrowLeft } from 'lucide-react';

/**
 * Branded 404. Previously the project had no not-found.tsx, so a mistyped URL
 * rendered Next's bare default page with no product context and no navigation.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070d1e] p-6 text-slate-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0e1730] p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-900">
          <Compass className="h-6 w-6 text-slate-400" aria-hidden="true" />
        </div>

        <p className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
          404 · No such station
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Route not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          That address does not correspond to a view in this console. If you followed
          a link from an audit report or work order, the station id may have changed.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#070d1e] transition-colors hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Operations command
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
