/**
 * Shared loading skeletons.
 *
 * Every route in this app is a client component, so there is no server-rendered
 * content to stream and nothing paints until hydration finishes. Without a
 * loading.tsx the user stares at a flat #070d1e rectangle during every
 * navigation — which, on the 843-line /dashboard and 992-line /mobile routes,
 * is a long time with no indication anything is happening.
 *
 * These are plain server-safe components: no 'use client', no state, so they
 * can be used directly from any loading.tsx.
 */

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-slate-800/70 ${className}`}
    />
  );
}

export function PageSkeleton({
  title,
  rows = 3,
  variant = 'cards',
}: {
  title: string;
  rows?: number;
  variant?: 'cards' | 'chart' | 'table';
}) {
  return (
    <div
      className="min-h-screen bg-[#070d1e] p-6 text-slate-200 sm:p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading {title}</span>

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3 border-b border-slate-800 pb-4">
          <Shimmer className="h-3 w-32" />
          <div className="flex items-center gap-3">
            <Shimmer className="h-6 w-6 rounded-lg" />
            <Shimmer className="h-7 w-64" />
          </div>
        </div>

        {variant === 'chart' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <Shimmer className="h-4 w-48" />
            <div className="mt-5 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Shimmer
                  key={i}
                  className="h-3"
                  // Staggered widths read as a chart without implying data.
                />
              ))}
            </div>
            <div className="mt-4 h-56 rounded-lg bg-slate-900/70" />
          </div>
        )}

        {variant === 'table' && (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="border-b border-slate-800 bg-slate-950/60 px-4 py-2">
              <Shimmer className="h-3 w-40" />
            </div>
            {Array.from({ length: rows + 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-slate-800/60 px-4 py-3 last:border-0"
              >
                <Shimmer className="h-3 w-20" />
                <Shimmer className="h-3 flex-1" />
                <Shimmer className="h-3 w-16" />
                <Shimmer className="h-3 w-12" />
              </div>
            ))}
          </div>
        )}

        {variant === 'cards' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: rows }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <Shimmer className="h-3 w-24" />
                    <Shimmer className="h-4 w-4 rounded" />
                  </div>
                  <Shimmer className="h-8 w-20" />
                  <Shimmer className="h-2.5 w-32" />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <Shimmer className="h-4 w-56" />
              <div className="mt-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="h-3" />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PageSkeleton;
