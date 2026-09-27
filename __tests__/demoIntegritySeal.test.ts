import { describe, it, expect } from 'vitest';
import { computeDemoIntegritySeal } from '../lib/anomalyLogic';

/**
 * Lock in the properties the demo integrity seal ACTUALLY has.
 *
 * The seal was previously presented in the UI as "HMAC-SHA256" + "Merkle root"
 * with a tamperStatus of 'AUTHENTIC'. It is neither. These tests exist so the
 * rename in lib/anomalyLogic.ts cannot be quietly reverted, and so the checksum
 * is at least deterministic and covered.
 *
 * If you replace computeDemoIntegritySeal with real Web Crypto HMAC-SHA256,
 * DELETE the "not tamper resistant" test below — it exists to document the
 * current limitation, not to prevent you from fixing it.
 */

describe('computeDemoIntegritySeal', () => {
  it('is deterministic for the same input', () => {
    const payload = 'AWS-DEL-04:1789000000000:27.2:998.4:92:NOMINAL_OPERATION';
    expect(computeDemoIntegritySeal(payload)).toEqual(computeDemoIntegritySeal(payload));
  });

  it('produces two distinct checksums for the same input', () => {
    const { checksumA, checksumB } = computeDemoIntegritySeal('AWS-DEL-04:x');
    expect(checksumA).not.toBe(checksumB);
  });

  it('changes when any field of the payload changes', () => {
    const base = computeDemoIntegritySeal('AWS-DEL-04:1000:27.2:998.4:92:NOMINAL');
    const variants = [
      'AWS-LEH-14:1000:27.2:998.4:92:NOMINAL', // station
      'AWS-DEL-04:1001:27.2:998.4:92:NOMINAL', // timestamp
      'AWS-DEL-04:1000:27.3:998.4:92:NOMINAL', // temperature
      'AWS-DEL-04:1000:27.2:998.5:92:NOMINAL', // pressure
      'AWS-DEL-04:1000:27.2:998.4:93:NOMINAL', // humidity
      'AWS-DEL-04:1000:27.2:998.4:92:SENSOR_SPIKE', // classification
    ];
    for (const v of variants) {
      expect(computeDemoIntegritySeal(v).checksumA).not.toBe(base.checksumA);
    }
  });

  it('emits hex strings in the legacy 0x-prefixed shape', () => {
    const { checksumA, checksumB } = computeDemoIntegritySeal('any');
    expect(checksumA).toMatch(/^0x[0-9a-f]{16}$/);
    // checksumB keeps the legacy 4-char constant suffix for D1 compatibility.
    expect(checksumB).toMatch(/^0x[0-9a-f]{20}$/);
  });

  it('is NOT tamper resistant — anyone who can write the row can recompute it', () => {
    // This test documents a KNOWN LIMITATION, not a desired behaviour.
    // The seal is an unkeyed checksum: knowledge of the algorithm is public, so
    // it cannot detect a deliberate edit. Only a server-held secret can.
    const forgedPayload = 'AWS-DEL-04:1000:99.9:1200.0:5:NOMINAL_OPERATION';
    const forged = computeDemoIntegritySeal(forgedPayload);

    // Anyone can produce a "valid looking" seal for arbitrary data.
    expect(forged.checksumA).toMatch(/^0x[0-9a-f]{16}$/);
    expect(forged.checksumA).toBe(computeDemoIntegritySeal(forgedPayload).checksumA);
  });
});
