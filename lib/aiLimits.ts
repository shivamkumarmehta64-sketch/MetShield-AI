/**
 * Cost and abuse limits for the AI endpoints.
 *
 * WHY THIS LIVES IN lib/ AND NOT IN A ROUTE
 * -----------------------------------------
 * Both /api/ai/copilot and /api/ai/tools need the same two guards. Writing
 * them twice invites the copies to drift, and a bound that differs between two
 * routes is a bound nobody can reason about. The first draft imported one
 * route's exports into the other, which works but puts a shared guard inside a
 * module whose exports Next.js validates as HTTP handlers.
 */

import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { consume, clientKey } from '@/lib/rateLimit';

/**
 * Cost control for an endpoint that can call a paid model.
 *
 * With OPENAI_API_KEY set, each request is a billable completion. Unbounded,
 * this is the most expensive unauthenticated endpoint in the deployment — a
 * caller can loop it, and with no key set it can still spin the rule-based
 * path to burn CPU.
 */
export const MAX_AI_REQUESTS_PER_MINUTE = 10;

/**
 * Hard cap on prompt length.
 *
 * Enforced before the model is called, and on the raw string rather than a
 * token count so it does not depend on the tokenizer: `maxOutputTokens` bounds
 * the reply but says nothing about what the caller may submit.
 */
export const MAX_AI_PROMPT_CHARS = 2000;

/**
 * Rate limit for an AI endpoint. Returns a 429 response, or null when allowed.
 *
 * `scope` keys the bucket per endpoint, so a caller cannot spend the copilot
 * budget and then use the same allowance on the tools route.
 */
export function enforceAiRequestLimits(headers: Headers, scope: 'copilot' | 'tools'): NextResponse | null {
  const verdict = consume(`ai:${scope}:${clientKey(headers)}`, MAX_AI_REQUESTS_PER_MINUTE, 60_000);
  if (!verdict.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded. Maximum ${MAX_AI_REQUESTS_PER_MINUTE} requests per minute.`,
        retryAfterSeconds: verdict.retryAfterSeconds,
      },
      { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } }
    );
  }
  return null;
}

/** Prompt-length guard. Returns a 413 response, or null when within bounds. */
export function enforcePromptLength(prompt: string): NextResponse | null {
  if (prompt.length > MAX_AI_PROMPT_CHARS) {
    return NextResponse.json(
      {
        success: false,
        error: `Prompt too long. Maximum ${MAX_AI_PROMPT_CHARS} characters; received ${prompt.length}.`,
      },
      { status: 413 }
    );
  }
  return null;
}

/**
 * Access gate for an endpoint that can reach a PAID model.
 *
 * WHY RATE LIMITING IS NOT ENOUGH
 * -------------------------------
 * Ten requests a minute is a lot when each one is a billable completion, and the
 * cap is per client key — which an attacker changes by rotating the header the
 * key is derived from. Until this existed, any caller who could reach the URL
 * could spend the deployment's OpenAI budget.
 *
 * FAIL CLOSED, SAME AS THE TELEMETRY WRITE PATH
 * ---------------------------------------------
 * The moment a model key is configured, a deployment is spending money on
 * strangers. So: if `OPENAI_API_KEY` is set and no `METSHIELD_AI_ACCESS_KEY` is
 * provisioned, every request is refused with 503 rather than served. The
 * alternative — "allow until someone configures it" — is the hole itself.
 *
 * With no model key configured the routes only run the local rule-based
 * fallback, which costs CPU and no money; those stay open for the demo.
 *
 * Comparison is constant-time over digests: a length-varying `===` on a secret
 * leaks its length, and a byte-varying one leaks its prefix.
 */
const AI_ACCESS_HEADER = 'x-metshield-ai-key';

function digestsMatch(presented: string, expected: string): boolean {
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function enforceAiAccess(headers: Headers): NextResponse | null {
  const modelConfigured = Boolean(process.env.OPENAI_API_KEY);
  if (!modelConfigured) return null;

  const expected = process.env.METSHIELD_AI_ACCESS_KEY;
  if (!expected) {
    return NextResponse.json(
      {
        success: false,
        error: 'AI access is not configured on this deployment.',
        remediation:
          'OPENAI_API_KEY is set but METSHIELD_AI_ACCESS_KEY is not. Set the access key, or unset the model key to serve the local rule-based fallback.',
      },
      { status: 503 }
    );
  }

  const presented = headers.get(AI_ACCESS_HEADER);
  if (!presented || !digestsMatch(presented, expected)) {
    return NextResponse.json(
      { success: false, error: 'AI access key missing or invalid.' },
      { status: 401 }
    );
  }
  return null;
}
