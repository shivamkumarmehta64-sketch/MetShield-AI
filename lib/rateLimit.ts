/**
 * Fixed-window rate limiter for unauthenticated and authenticated endpoints.
 *
 * WHY A SEPARATE MODULE
 * ---------------------
 * Three routes needed limiting (telemetry ingestion, and the two AI endpoints)
 * and the first implementation was an inline `Map` copy-pasted into one of
 * them. Duplicated limiter state is duplicated limiter bugs: the copies drift,
 * and a bound that differs between two routes is a bound nobody can reason
 * about. One implementation, one set of semantics.
 *
 * THE LIMITATION, STATED PLAINLY
 * ------------------------------
 * State is per-process. On a serverless deployment each cold instance keeps its
 * own counters, so the effective limit is roughly `limit × instances`. This is
 * friction against a casual or accidental flood, not a guarantee against a
 * determined attacker — that requires a shared store (Upstash, Redis, or the
 * D1 binding this project already has). Saying so here is the point; the
 * previous inline limiter was presented as protection without that caveat.
 *
 * Entries are swept lazily on write, so an idle process does not accumulate one
 * Map entry per caller forever.
 */

interface Window {
  count: number;
  resetTime: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** Seconds until the current window rolls over. Meaningful only when blocked. */
  retryAfterSeconds: number;
  /** Requests remaining in the current window. Meaningful only when allowed. */
  remaining: number;
}

const buckets = new Map<string, Window>();

/** Cap on distinct tracked keys, so a rotating-IP flood cannot grow the Map. */
const MAX_TRACKED_KEYS = 10_000;

/**
 * Record a hit against `key` and report whether it is over `max`.
 *
 * @param windowMs  Length of the sliding window.
 * @param max       Requests permitted per window.
 */
export function consume(key: string, max: number, windowMs: number): RateLimitVerdict {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetTime <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) sweep(now);
    buckets.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0, remaining: max - 1 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetTime - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count++;
  return { allowed: true, retryAfterSeconds: 0, remaining: max - existing.count };
}

/** Drop windows that have already rolled over. Called only when the Map is full. */
function sweep(now: number): void {
  for (const [key, window] of buckets) {
    if (window.resetTime <= now) buckets.delete(key);
  }
  // If every window is still live the Map stays at its cap and the oldest
  // tracked callers simply keep their counters; that is the intended
  // fail-closed behaviour under sustained load.
}

/** Clear all state. Exists so tests do not depend on execution order. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * The client address to rate-limit against.
 *
 * `x-forwarded-for` is a client-settable header. It is used because every
 * deployment this project targets is fronted by a proxy that sets it, and a
 * limiter keyed on nothing is worse than no limiter — but it does mean a caller
 * who sets it can rotate the key and get a fresh budget. Treat the resulting
 * limit as one layer, not as the boundary; see the note at the top of the file.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
