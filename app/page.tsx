import LandingPage from '@/components/features/LandingPage';

/**
 * The public front door.
 *
 * This used to mount `RealTimeQCCanvas` — a full-viewport interactive QC demo —
 * directly at `/`. That made the project's first screen a widget with no
 * statement of what the system is, while the actual landing page
 * (`components/features/LandingPage.tsx`) sat imported by nothing.
 *
 * `/` is the landing page. The canvas keeps its own route at `/canvas` so the
 * demo is still reachable rather than deleted.
 */
export default function Page() {
  return <LandingPage />;
}
