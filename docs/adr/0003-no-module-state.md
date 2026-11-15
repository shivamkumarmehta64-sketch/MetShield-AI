# ADR-0003 — No module-level mutable state in server code

**Status:** Accepted · 2026-11-15

## Context

`lib/` keeps state at module scope, which in a serverless deployment is
per-instance and survives across unrelated requests:

| Module | Module-level state |
|---|---|
| `lib/networkFeed.ts` | `cached`, `incidentCache`, `trendCache`, `classificationCache`, `flagCache` |
| `lib/anomalyLogic.ts` | `nicWmoEngineInstance` — a singleton whose per-station buffers grow with every observation |
| `lib/districtEngine.ts` | `isQueueWorkerRunning`, `notifyTimeout`, `lastNotifyTime`, `rateLimitBackoffUntil` |
| `lib/vayuPoller.ts` | `pollerIntervalId` |
| `lib/supabaseClient.ts` | `auditSnapshot` |
| `lib/offlineStorage.ts` | `dbPromise` (browser only — fine) |

Three consequences are already visible:

1. **Cross-request bleed.** Two users hitting `/dashboard` share one engine's
   buffers; a station's history depends on who loaded the page first.
2. **Unbounded growth.** Buffers are appended per observation with no eviction,
   on an instance that may live for hours.
3. **Non-deterministic tests.** Test order can change a verdict, which is why
   `getInitialSeededDataset()` exists as a separate deterministic path.

The background worker and poller are started from a request. On serverless that
is a timer attached to a doomed instance: it runs until the instance is
reclaimed, then silently stops.

## Decision

Server code holds no mutable module-level state.

- Caches become an explicit, bounded object created per request (or are removed;
  the snapshot is cheap to rebuild).
- The engine is instantiated per request, or its buffers are passed in.
- Background work moves to the existing authenticated cron route
  (`/api/telemetry/cron`) driven by a platform scheduler, not an in-process timer.

Browser-only state (`lib/offlineStorage.ts`, `dbPromise`) is exempt: it is
per-tab by construction.

## Consequences

- Requests become reproducible: same input, same verdict, regardless of order.
- Memory is bounded by one request's work.
- A cache hit becomes a deliberate decision with a size and TTL, not an
  accident of module lifetime.
- Cost: the in-process cache currently makes the dashboard cheap to render. It
  must be replaced by measurement — either the snapshot rebuilds fast enough
  (it does: 21 stations, sub-millisecond engine), or it moves behind the HTTP
  cache the weather route already uses.

## Alternatives rejected

- **Keep the caches and cap them.** Still per-instance, still not shareable, and
  still makes two identical requests disagree depending on history.
- **Add Redis.** Introduces a dependency and a failure mode to solve a problem
  that measured fast enough to solve by not caching.

## Validation

After the change: two interleaved test runs over different station orders must
produce identical verdicts, and a soak test that posts 10k observations must
show flat memory.
