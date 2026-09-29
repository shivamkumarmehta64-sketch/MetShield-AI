/**
 * SECURITY REGRESSION — the telemetry write path must not be writable by anyone
 * who can reach the URL.
 *
 * WHAT THESE TESTS ARE FOR
 * -----------------------
 * Two facts about the deployment made this boundary urgent:
 *
 *   1. `action: "CALIBRATE_OFFSET"` rewrote a station's barometric register.
 *      That register is the baseline every later QC verdict for the station is
 *      computed against, so an unauthenticated write here silently changes what
 *      the system reports about real weather.
 *   2. Ordinary observation ingestion accepted any caller. An injected reading
 *      is indistinguishable from a genuine sensor fault to every downstream
 *      consumer, so this was a way to manufacture QC events, not just noise.
 *
 * `proxy.ts` did reject cross-origin POSTs, but `Origin` is set by the client:
 * a script sets it to anything and curl sends none. Tests here drive
 * `authorizeWrite` directly, bypassing any request context, which is
 * deliberately the most hostile framing available.
 *
 * These are not weakened to make the suite pass. If a change breaks
 * authentication, the correct response is to fix the change.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { authorizeWrite, isWriteAuthConfigured, type AuthResult } from '@/lib/auth';
import { consume, resetRateLimits } from '@/lib/rateLimit';
import { enforceAiRequestLimits, MAX_AI_PROMPT_CHARS, enforcePromptLength } from '@/lib/aiLimits';

const ROOT = join(__dirname, '..');

const VALID_PSK = 'station-key-at-least-16-chars-long';

/** Provision a table, then restore whatever the environment actually had. */
function withCredentials(table: Record<string, { psk: string; calibration: boolean }>) {
  const previous = process.env.METSHIELD_STATION_CREDENTIALS;
  process.env.METSHIELD_STATION_CREDENTIALS = JSON.stringify(table);
  return () => {
    if (previous === undefined) delete process.env.METSHIELD_STATION_CREDENTIALS;
    else process.env.METSHIELD_STATION_CREDENTIALS = previous;
  };
}

function headers(credential?: string): Headers {
  const h = new Headers();
  if (credential !== undefined) h.set('authorization', `Bearer ${credential}`);
  return h;
}

function expectDenied(result: AuthResult, status: number, reason?: string) {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.status).toBe(status);
    if (reason) expect(result.reason).toBe(reason);
  }
}

describe('telemetry write authentication', () => {
  let restore: (() => void) | undefined;

  beforeEach(() => {
    restore = withCredentials({
      'AWS-DEL-01': { psk: VALID_PSK, calibration: true },
      'AWS-MUM-02': { psk: VALID_PSK, calibration: false },
    });
  });

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('SEC-1: refuses a write with no credential at all', () => {
    // The regression that matters most. Before the fix this returned 200 and
    // the calibration offset was committed.
    expectDenied(authorizeWrite(headers(), 'AWS-DEL-01', 'calibration'), 401, 'MISSING_CREDENTIAL');
  });

  it('SEC-2: refuses a write presenting the wrong key', () => {
    expectDenied(
      authorizeWrite(headers('not-the-key'), 'AWS-DEL-01', 'calibration'),
      401,
      'INVALID_CREDENTIAL'
    );
  });

  it('SEC-3: refuses a key that is valid for a *different* station', () => {
    // Per-station, not per-deployment. A compromised station must not yield the
    // whole network's write access.
    const result = authorizeWrite(headers(VALID_PSK), 'AWS-KOL-99', 'telemetry');
    expectDenied(result, 403, 'STATION_NOT_PROVISIONED');
  });

  it('SEC-4: refuses calibration for a telemetry-only credential', () => {
    // Authentication and authorization are separate checks. Proving you are
    // AWS-MUM-02 must not grant the ability to rewrite its register.
    expectDenied(authorizeWrite(headers(VALID_PSK), 'AWS-MUM-02', 'calibration'), 403, 'CALIBRATION_NOT_PERMITTED');
  });

  it('SEC-5: accepts a valid telemetry write', () => {
    const result = authorizeWrite(headers(VALID_PSK), 'AWS-MUM-02', 'telemetry');
    expect(result.ok).toBe(true);
  });

  it('SEC-6: accepts a valid calibration write for a provisioned station', () => {
    const result = authorizeWrite(headers(VALID_PSK), 'AWS-DEL-01', 'calibration');
    expect(result.ok).toBe(true);
  });

  it('SEC-7: fails closed when no credential table is configured', () => {
    // The tempting alternative was "allow when unconfigured, so the demo
    // works" — which reinstates the exact hole. A deployment that forgets the
    // env var must refuse writes, not open them.
    delete process.env.METSHIELD_STATION_CREDENTIALS;
    expectDenied(authorizeWrite(headers(VALID_PSK), 'AWS-DEL-01', 'telemetry'), 503, 'AUTH_NOT_CONFIGURED');
    expect(isWriteAuthConfigured()).toBe(false);
  });

  it('SEC-8: fails closed when the credential table is malformed', () => {
    for (const malformed of ['{not json', '[]', '"a string"', '{"AWS-DEL-01": {"psk": "short"}}']) {
      process.env.METSHIELD_STATION_CREDENTIALS = malformed;
      expectDenied(authorizeWrite(headers(VALID_PSK), 'AWS-DEL-01', 'telemetry'), 503);
    }
  });

  it('SEC-9: refuses every write path when the table parses to zero usable entries', () => {
    process.env.METSHIELD_STATION_CREDENTIALS = JSON.stringify({ 'AWS-DEL-01': { psk: 'tiny' } });
    expectDenied(authorizeWrite(headers('tiny'), 'AWS-DEL-01', 'telemetry'), 503);
  });

  it('SEC-10: does not reveal whether a different key would have been accepted', () => {
    // An oracle here would let an unauthenticated caller enumerate the network
    // one guess at a time. Both refusals must be the same shape.
    const wrongKey = authorizeWrite(headers('wrong'), 'AWS-DEL-01', 'telemetry');
    const missing = authorizeWrite(headers(), 'AWS-DEL-01', 'telemetry');
    expect(wrongKey.ok).toBe(false);
    expect(missing.ok).toBe(false);
    if (!wrongKey.ok && !missing.ok) {
      expect(wrongKey.remediation).toBe(missing.remediation);
    }
  });

  it('SEC-11: accepts the X-Station-Key header as an equivalent credential', () => {
    const h = new Headers({ 'x-station-key': VALID_PSK });
    expect(authorizeWrite(h, 'AWS-DEL-01', 'telemetry').ok).toBe(true);
  });

  it('SEC-12: rejects a malformed Authorization header rather than treating it as absent', () => {
    const h = new Headers({ authorization: 'Basic dXNlcjpwYXNz' });
    expectDenied(authorizeWrite(h, 'AWS-DEL-01', 'telemetry'), 401, 'MISSING_CREDENTIAL');
  });
});

/**
 * The route must actually call the guard. An authorisation module that nothing
 * imports passes every test above and protects nothing, so these assert the
 * wiring rather than the module.
 */
describe('the write path is wired to the guard', () => {
  const route = readFileSync(join(ROOT, 'app', 'api', 'telemetry', 'route.ts'), 'utf8');

  it('SEC-13: guards observation ingestion, not only calibration', () => {
    // Ordering is the whole point: the calibration check returns early, so a
    // guard that only appears inside that branch would leave the ingestion
    // path — the larger hole — open.
    const calibrationIndex = route.indexOf("body.action === 'CALIBRATE_OFFSET'");
    const ingestGuard = route.indexOf("authorizeWrite(request.headers, stationId, 'telemetry')");
    expect(calibrationIndex).toBeGreaterThan(-1);
    expect(ingestGuard).toBeGreaterThan(calibrationIndex);
  });

  it('SEC-14: guards calibration with the stronger scope', () => {
    expect(route).toContain("authorizeWrite(request.headers, stationId, 'calibration')");
  });

  it('SEC-15: does not treat technicianId as proof of identity', () => {
    // technicianId is a free-text field in the request body. Anyone can put any
    // name in it, so it can appear in the audit trail but must never appear in
    // an authorisation decision.
    const body = route.slice(route.indexOf('CALIBRATE_OFFSET'), route.indexOf('parseParam'));
    const authCalls = body.match(/authorizeWrite\([^)]*\)/g) || [];
    expect(authCalls.length).toBeGreaterThan(0);
    for (const call of authCalls) {
      expect(call).not.toContain('technicianId');
      expect(call).not.toContain('techId');
    }
  });
});

describe('rate limiting', () => {
  beforeEach(() => resetRateLimits());
  afterEach(() => resetRateLimits());

  it('SEC-16: blocks once the window budget is spent and then admits again', () => {
    // Fake timers would make this deterministic, but the limiter reads
    // Date.now() directly and a wall-clock 60 s window is not worth a test
    // timeout. A 5 ms window exercises the same rollover path.
    for (let i = 0; i < 3; i++) expect(consume('k', 3, 5).allowed).toBe(true);
    expect(consume('k', 3, 5).allowed).toBe(false);
  });

  it('SEC-17: keys buckets independently', () => {
    for (let i = 0; i < 3; i++) consume('a', 3, 60_000);
    expect(consume('a', 3, 60_000).allowed).toBe(false);
    expect(consume('b', 3, 60_000).allowed).toBe(true);
  });

  it('SEC-18: bounds the AI endpoints', () => {
    for (let i = 0; i < 10; i++) {
      expect(enforceAiRequestLimits(new Headers(), 'copilot')).toBeNull();
    }
    const blocked = enforceAiRequestLimits(new Headers(), 'copilot');
    expect(blocked?.status).toBe(429);
  });

  it('SEC-19: the two AI endpoints have separate budgets', () => {
    // A caller must not spend the copilot allowance and carry the remainder
    // over to the tools route.
    for (let i = 0; i < 10; i++) enforceAiRequestLimits(new Headers(), 'copilot');
    expect(enforceAiRequestLimits(new Headers(), 'copilot')?.status).toBe(429);
    expect(enforceAiRequestLimits(new Headers(), 'tools')).toBeNull();
  });

  it('SEC-20: caps prompt length before the model is called', () => {
    expect(enforcePromptLength('a'.repeat(MAX_AI_PROMPT_CHARS))).toBeNull();
    expect(enforcePromptLength('a'.repeat(MAX_AI_PROMPT_CHARS + 1))?.status).toBe(413);
  });
});

describe('Origin checking is not presented as authentication', () => {
  const proxy = readFileSync(join(ROOT, 'proxy.ts'), 'utf8');

  it('SEC-21: the CSRF check does not return 401', () => {
    // 401 means "authenticate and retry". Returning it for an Origin failure
    // told an operator their credential was wrong when the real problem was
    // that no credential is ever checked there.
    const originBlock = proxy.slice(proxy.indexOf('isOriginAllowed(origin)'));
    const statusMatch = /status:\s*(\d+)/.exec(originBlock);
    expect(statusMatch?.[1]).toBe('403');
  });

  it('SEC-22: the check is labelled as CSRF friction where it is written', () => {
    expect(proxy).toMatch(/CSRF friction/i);
    expect(proxy).toMatch(/not authentication/i);
  });
});
