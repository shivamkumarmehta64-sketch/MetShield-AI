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

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

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

/**
 * The MAC on an accepted write, plus what it covers.
 *
 * `authenticated` is false when no key table is configured. That is not a
 * degraded mode to paper over — it is the fail-closed case from above, and a
 * receipt that claimed to be authenticated without a key would be exactly the
 * fabricated claim this module exists to prevent.
 */
export interface PacketSeal {
  /** HMAC-SHA256 hex digest, or null when no key is provisioned. */
  mac: string | null;
  /** True only when a real key produced this digest. */
  authenticated: boolean;
  /** The station whose key signed it — never the key itself. */
  stationId: string;
  /** Epoch ms the seal was computed over, for replay reasoning. */
  signedAt: number;
}

/**
 * Canonical byte-string a station's observations are signed over.
 *
 * Field order is fixed and the timestamp is pinned to whole seconds, so the
 * same observation signed twice yields the same MAC — which is what lets a
 * verifier recompute it rather than trust the sender's word.
 *
 * Numbers are pinned to the same 2-decimal form `POST /api/telemetry` parses
 * them into. Signing the raw request instead would mean a station that sent
 * `27.2` and `27.20` produced different MACs for the same observation.
 */
function canonicalPayload(
  stationId: string,
  timestamp: number,
  temperature: number | null,
  pressure: number | null,
  humidity: number | null
): string {
  const num = (v: number | null) => (v === null ? 'null' : v.toFixed(2));
  const ts = Math.floor(timestamp / 1000);
  return `${stationId}|${ts}|${num(temperature)}|${num(pressure)}|${num(humidity)}`;
}

/**
 * HMAC-SHA256 a station's observation with that station's own pre-shared key.
 *
 * WHY THIS LIVES HERE AND NOT IN `lib/anomalyLogic.ts`
 * ---------------------------------------------------
 * The benchmark packets the console renders are built in the browser — every
 * caller of `getNetworkSnapshot()` is a `'use client'` module. Signing those
 * with a station key would put every PSK in the client bundle, which is strictly
 * worse than the unkeyed checksum it replaced. So the MAC is computed only on
 * the write path, where the station has already proved possession of its key
 * and the server is the one holding it.
 *
 * A client can therefore *display* a seal but can never *mint* one. That is the
 * entire security property, and it is why this function is not exported into
 * any UI module.
 */
export function signObservation(params: {
  stationId: string;
  timestamp: number;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
}): PacketSeal {
  const { stationId, timestamp, temperature, pressure, humidity } = params;
  const table = loadCredentials();
  const credential = table?.get(stationId);

  if (!credential) {
    // No key provisioned: return an honest, unauthenticated seal. The write path
    // has already refused this station by this point — reaching here means the
    // packet is not going to be persisted as trusted anyway.
    return { mac: null, authenticated: false, stationId, signedAt: Date.now() };
  }

  const payload = canonicalPayload(stationId, timestamp, temperature, pressure, humidity);
  const mac = createHmac('sha256', credential.psk).update(payload, 'utf8').digest('hex');

  return { mac, authenticated: true, stationId, signedAt: Date.now() };
}

/**
 * Recompute and compare a seal.
 *
 * Constant-time on the comparison, and a missing seal or missing key both return
 * false rather than throwing — a verifier must not be able to distinguish "no
 * key configured" from "bad MAC", or it becomes an enumeration oracle for which
 * stations are provisioned.
 */
export function verifyObservation(
  seal: Pick<PacketSeal, 'mac' | 'stationId'>,
  params: Omit<Parameters<typeof signObservation>[0], 'stationId'>
): boolean {
  if (!seal.mac) return false;

  const table = loadCredentials();
  const credential = table?.get(seal.stationId);
  if (!credential) return false;

  const payload = canonicalPayload(seal.stationId, params.timestamp, params.temperature, params.pressure, params.humidity);
  const expected = createHmac('sha256', credential.psk).update(payload, 'utf8').digest('hex');

  return secretsMatch(expected, seal.mac);
}
