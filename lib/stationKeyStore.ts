'use client';

/**
 * Where a field node keeps its pre-shared key.
 *
 * WHY A STORE EXISTS
 * ------------------
 * POST /api/telemetry now requires a per-station credential (lib/auth.ts), and
 * this page is the only caller. Before that change the page posted anonymous.
 * The honest options were to break the page, to add a bypass, or to have the
 * operator supply the key; this is the third. There is deliberately no default
 * value and no "development" key, because a shipped default is a shipped hole —
 * a prototype that refuses to transmit until it is provisioned is defensible in
 * front of a technical panel, and one that transmits by default is not.
 *
 * WHAT IS STORED
 * --------------
 * The key itself, in `localStorage`, base64-encoded. Base64 is an encoding, not
 * encryption: anything running on the same origin — any XSS, any extension, any
 * devtools user — can read it. It is encoded only so the value is not sitting
 * in plain sight in devtools, and because a real deployment would hold this in
 * the device's secure element rather than web storage. Do not describe this as
 * secure storage.
 *
 * This is the correct trade for a browser-served field client, and it is the
 * weakest of the available options. A production node would be a native app
 * with the key in the platform keystore, and the per-station pre-shared key
 * would terminate TLS per station (see lib/auth.ts).
 */

const STORAGE_KEY = 'metshield.stationKey.v1';

/**
 * Read the configured key.
 *
 * Returns '' when nothing is provisioned, which the caller must treat as "not
 * authenticated" rather than as an empty credential to send.
 */
export function getStationKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    // Safari in private mode throws on localStorage access. Treat that as
    // "no key stored" rather than crashing the page.
    return '';
  }
}

/** Persist the key. Returns false when the browser refused to store it. */
export function setStationKey(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, encodeStationKey(key));
    return true;
  } catch {
    return false;
  }
}

/** Forget the key, e.g. when a node is being handed back. */
export function clearStationKey(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; the key is unreachable in this context anyway.
  }
}

/**
 * Read the stored key and format it for the Authorization header.
 *
 * A shared helper so the live-transmit and offline-replay paths cannot drift
 * into sending the credential differently.
 */
export function telemetryAuthHeader(): Record<string, string> {
  const key = getStationKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

/**
 * Base64 that survives non-ASCII.
 *
 * `btoa` throws on any code point above U+00FF, which a technician pasting a
 * key from a password manager can easily produce. The encode-first step keeps
 * this total.
 */
function encodeStationKey(key: string): string {
  const bytes = new TextEncoder().encode(key);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeStationKey(stored: string): string {
  const binary = atob(stored);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Value for the operator-facing input, or '' if what is stored cannot be
 * decoded back. The raw form is never shown, so a corrupt entry surfaces as
 * "enter it again" instead of as garbage in the field.
 */
export function stationKeyForDisplay(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return '';
    return decodeStationKey(stored);
  } catch {
    return '';
  }
}
