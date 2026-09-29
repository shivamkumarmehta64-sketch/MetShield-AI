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
