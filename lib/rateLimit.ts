/**
 * Fixed-window rate limiter for unauthenticated and authenticated endpoints.
 *
 * BOUNDED MEMORY & PROXY TRUST
 * ----------------------------
 * 1. The bucket Map is strictly capped at `MAX_TRACKED_KEYS` (10,000). When the
 *    Map reaches capacity and a sweep of expired windows frees zero slots (all
 *    entries are still active), new unknown keys fail closed (allowed: false)
 *    without inserting into the Map. Memory usage is strictly O(MAX_TRACKED_KEYS).
 * 2. Caller-supplied `X-Forwarded-For` and `X-Real-IP` headers are NOT trusted
 *    because any client can spoof them to rotate buckets. Only platform-verified
 *    headers overwritten by the hosting edge (`x-vercel-forwarded-for`,
 *    `cf-connecting-ip`) are used. When neither is present (e.g. local dev or
 *    unproxied runtime), callers share a conservative fallback bucket
 *    (`untrusted-client`).
 * 3. State remains per-process. For multi-instance horizontal scaling, pair
 *    this with a shared edge store (Upstash Redis / Cloudflare D1).
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

/** Hard cap on distinct tracked keys so a unique-key flood cannot grow the Map. */
export const MAX_TRACKED_KEYS = 10_000;

/**
 * Record a hit against `key` and report whether it is over `max`.
 *
 * @param key       Bucket identifier.
 * @param max       Requests permitted per window.
 * @param windowMs  Length of the fixed window in milliseconds.
 * @param maxKeys   Optional cap override (defaults to `MAX_TRACKED_KEYS`).
 */
export function consume(
  key: string,
  max: number,
  windowMs: number,
  maxKeys: number = MAX_TRACKED_KEYS
): RateLimitVerdict {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetTime <= now) {
    if (buckets.size >= maxKeys) {
      sweep(now);
    }
    // Fail closed if all tracked windows are still active at capacity.
    if (buckets.size >= maxKeys) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
        remaining: 0,
      };
    }
    buckets.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0, remaining: Math.max(0, max - 1) };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetTime - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count++;
  return { allowed: true, retryAfterSeconds: 0, remaining: Math.max(0, max - existing.count) };
}

/** Drop windows that have already rolled over. Called only when the Map is full. */
function sweep(now: number): void {
  for (const [key, window] of buckets) {
    if (window.resetTime <= now) buckets.delete(key);
  }
}

/** Current number of tracked keys in memory (for diagnostics and tests). */
export function getTrackedBucketCount(): number {
  return buckets.size;
}

/** Clear all state. Exists so tests do not depend on execution order. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Resolve a trusted client identifier for rate limiting.
 *
 * Ignores arbitrary `x-forwarded-for` / `x-real-ip` headers that callers can
 * spoof, trusting only edge-verified headers (`x-vercel-forwarded-for` on
 * Vercel, `cf-connecting-ip` on Cloudflare). Falls back to a conservative
 * shared key `'untrusted-client'` when no verified proxy header is present.
 */
export function clientKey(headers: Headers): string {
  const vercelIp = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercelIp) return vercelIp;

  const cfIp = headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  if (process.env.TRUST_PROXY_HEADERS === '1') {
    const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) return forwarded;
    const realIp = headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;
  }

  return 'untrusted-client';
}
