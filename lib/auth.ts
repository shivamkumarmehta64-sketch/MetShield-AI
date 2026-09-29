/**
 * Telemetry write-path authentication.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * POST /api/telemetry accepts arbitrary observations, and its
 * `action: "CALIBRATE_OFFSET"` branch rewrites a station's barometric register
 * — the value every subsequent QC verdict for that station is computed against.
 * Until this module existed, both were reachable by anyone who could reach the
 * URL. `proxy.ts` did reject cross-origin POSTs, but that is CSRF friction, not
 * authentication: a non-browser client sets the `Origin` header to anything it
 * likes, and a server-side `curl` sends no Origin at all. Treating that check
 * as a security boundary is the specific error this module replaces.
 *
 * WHAT THIS IS, PRECISELY
 * -----------------------
 * A pre-shared key per station, presented as a bearer credential. That is a real
 * authentication control with a real limitation: a PSK is a shared secret, so a
 * compromised station yields that station's key and nothing else. It is not
 * mutual TLS, not a signature scheme, and not tamper evidence. It is described
 * that way here, in the route, and in the UI, and nowhere else.
 *
 * It is also not a substitute for network segmentation. This is the same
 * control a prototype can defend on a stage; a national deployment should
 * terminate TLS per station and hold keys in an HSM-backed secret store rather
 * than an environment variable.
 *
 * FAIL CLOSED
 * -----------
 * If no key table is configured, every write is refused. The tempting
 * alternative — "allow when unconfigured, so the demo works" — is precisely
 * the hole being closed, and a deployment that forgets to set an env var would
 * silently ship it back open. The refusal is a 503 with an actionable message,
 * not a 401, because the cause is a server misconfiguration rather than a bad
 * credential.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

/** Outcome of authenticating a write-path request. */
export type AuthResult =
  | { ok: true; stationId: string; scope: 'telemetry' | 'calibration' }
  | {
      ok: false;
      status: 401 | 403 | 503;
      reason: string;
      /** What the caller should do about it, safe to return to the client. */
      remediation: string;
    };

/** One provisioned station. `calibration` is the authorization bit. */
interface StationCredential {
  psk: string;
  /** May this station rewrite its own barometric register? */
  calibration: boolean;
}

const DEPLOYMENT_NOT_CONFIGURED = {
  ok: false,
  status: 503,
  reason: 'AUTH_NOT_CONFIGURED',
  remediation:
    'No station credentials are configured on this deployment. Set METSHIELD_STATION_CREDENTIALS ' +
    'to a JSON object mapping stationId to { "psk": "<secret>", "calibration": <boolean> } and restart.',
} as const satisfies Omit<Extract<AuthResult, { ok: false }>, never>;

/**
 * Parse the credential table from the environment.
 *
 * Deliberately re-parsed on every call rather than cached at module load: a
 * long-lived server process would otherwise keep a stale table after an
 * operator rotated a key, and the rotation would appear not to work.
 */
function loadCredentials(): Map<string, StationCredential> | null {
  const raw = process.env.METSHIELD_STATION_CREDENTIALS;
  if (!raw || !raw.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // A malformed table is a deployment fault. Treating it as "unconfigured"
    // keeps the fail-closed path, and the reason string below says why.
    console.error('[auth] METSHIELD_STATION_CREDENTIALS is not valid JSON. All writes refused.');
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    console.error('[auth] METSHIELD_STATION_CREDENTIALS must be a JSON object keyed by stationId.');
    return null;
  }

  const table = new Map<string, StationCredential>();
  for (const [stationId, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const { psk, calibration } = value as { psk?: unknown; calibration?: unknown };
    if (typeof psk !== 'string' || psk.length < 16) {
      console.error(`[auth] Credential for ${stationId} rejected: psk must be a string of at least 16 characters.`);
      continue;
    }
    table.set(stationId, { psk, calibration: calibration === true });
  }

  return table.size > 0 ? table : null;
}

/**
 * Constant-time comparison of two secrets.
 *
 * Both sides are hashed first so that `timingSafeEqual` — which throws on
 * length mismatch — is always given equal-length buffers, and so the comparison
 * leaks nothing about the expected key's length.
 */
function secretsMatch(presented: string, expected: string): boolean {
  const a = createHash('sha256').update(presented, 'utf8').digest();
  const b = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(a, b);
}

/**
 * Pull the presented credential out of the request.
 *
 * `Authorization: Bearer <key>` is the primary form. `X-Station-Key` exists for
 * field devices and browser clients that cannot set custom headers on a
 * cross-origin request without a preflight; it is equally secret, just less
 * conventional.
 */
function readPresentedCredential(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (auth) {
    const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (match) return match[1].trim();
    // A malformed Authorization header is a client error, not a missing one.
    return '';
  }
  const header = headers.get('x-station-key');
  return header === null ? null : header.trim();
}

/**
 * The single message returned for every credential failure.
 *
 * Deliberately identical for "no credential supplied" and "wrong credential
 * supplied". Differentiating them tells an unauthenticated caller whether the
 * key they guessed was close, which is a working oracle for enumerating the
 * provisioned network one guess at a time. It also says nothing about whether
 * the station exists, so a caller learns only that the write was refused.
 *
 * The reason code is still returned separately for the operator's logs, where
 * "the device is misconfigured" and "someone is guessing" are worth telling
 * apart — but it is a different audience than the caller.
 */
const CREDENTIAL_REFUSED =
  'Provide the station pre-shared key as "Authorization: Bearer <key>" or "X-Station-Key: <key>". ' +
  'The credential was absent or was not accepted.';

/**
 * Authenticate a write-path request for `stationId` and require `scope`.
 *
 * Authentication and authorization are separate checks on purpose. A station
 * key proves *which station is talking*; it must not by itself grant the
 * ability to rewrite that station's calibration register. A station that is
 * provisioned for telemetry but not for calibration gets a 403, distinct from
 * the 401 it would get for a bad key — an operator can then tell "the device
 * is not allowed to do that" from "the device could not prove what it is".
 */
export function authorizeWrite(
  headers: Headers,
  stationId: string,
  scope: 'telemetry' | 'calibration'
): AuthResult {
  const table = loadCredentials();
  if (!table) return DEPLOYMENT_NOT_CONFIGURED;

  const credential = table.get(stationId);
  if (!credential) {
    // 403, not 404: the station exists in the registry, this caller just has
    // no key provisioned for it.
    return {
      ok: false,
      status: 403,
      reason: 'STATION_NOT_PROVISIONED',
      remediation: 'This stationId has no provisioned credential on this deployment.',
    };
  }

  const presented = readPresentedCredential(headers);
  if (presented === null || presented === '') {
    return {
      ok: false,
      status: 401,
      reason: 'MISSING_CREDENTIAL',
      remediation: CREDENTIAL_REFUSED,
    };
  }

  if (!secretsMatch(presented, credential.psk)) {
    return {
      ok: false,
      status: 401,
      reason: 'INVALID_CREDENTIAL',
      // Same text as the missing case, on purpose. See CREDENTIAL_REFUSED.
      remediation: CREDENTIAL_REFUSED,
    };
  }

  if (scope === 'calibration' && !credential.calibration) {
    return {
      ok: false,
      status: 403,
      reason: 'CALIBRATION_NOT_PERMITTED',
      remediation: 'This station credential is provisioned for telemetry only, not for calibration.',
    };
  }

  return { ok: true, stationId, scope };
}

/**
 * Whether any write path is usable at all.
 *
 * Used by the UI to explain *why* a submission failed instead of showing a
 * generic error, and by the security test to assert the fail-closed path.
 */
export function isWriteAuthConfigured(): boolean {
  return loadCredentials() !== null;
}
