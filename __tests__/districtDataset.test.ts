import { describe, it, expect } from 'vitest';
import { ALL_766_DISTRICTS } from '../lib/india766Districts';

/**
 * Integrity coverage for the district registry.
 *
 * This dataset was presented in the UI as "766 Districts" — authoritative
 * national ground truth. It had ZERO tests, which is how 55 fabricated records
 * and one district duplicated under two different states shipped inside that
 * count.
 *
 * WHAT WAS WRONG (all now fixed)
 * ------------------------------
 *  - 55 records named "<RealDistrict> Central" (Krishna Central, Banka Central,
 *    …). Every one shadowed a real district already present in the registry —
 *    verified 55/55. They existed only to pad the count to 766.
 *  - Kargil appeared twice: DST-IND-185 attributed it to "Jammu and Kashmir"
 *    with a population of 4,161,022, and DST-MOD-618 attributed it to Ladakh
 *    with 140,802. Kargil is a district of Ladakh; the first record had the
 *    wrong state and an order-of-magnitude wrong population.
 *  - The registry is now 710 records, not 766. The honest count is smaller.
 *
 * WHAT IS *NOT* A BUG
 * -------------------
 * Five names legitimately repeat across different states, and that is correct
 * Indian geography: Aurangabad (Bihar and Maharashtra), Bilaspur (Chhattisgarh
 * and Himachal Pradesh), Hamirpur (Himachal Pradesh and Uttar Pradesh),
 * Junagadh (Daman and Diu and Gujarat), Raigarh (Chhattisgarh and Maharashtra).
 * These are distinguished by `state`, and the test below asserts exactly that.
 */

const REAL_PREFIX = 'DST-IND-';
const MODIFIED_PREFIX = 'DST-MOD-';
const SYNTHETIC_PREFIX = 'DST-SUB-';

const byPrefix = (prefix: string) =>
  ALL_766_DISTRICTS.filter((d) => d.id.startsWith(prefix));

describe('ALL_766_DISTRICTS — structural integrity', () => {
  it('contains exactly 710 records', () => {
    // Not 766. The 55 fabricated "… Central" records were removed because they
    // shadowed real districts and were shown to users as real districts.
    expect(ALL_766_DISTRICTS).toHaveLength(710);
  });

  it('has no duplicate district ids', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const d of ALL_766_DISTRICTS) {
      if (seen.has(d.id)) dupes.push(d.id);
      seen.add(d.id);
    }
    expect(dupes).toEqual([]);
  });

  it('lists each district exactly once', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const d of ALL_766_DISTRICTS) {
      // Identity is name + state: the same name in two states is legitimate,
      // the same name in the same state is a duplicate record.
      const key = `${d.name}|${d.state}`;
      if (seen.has(key)) dupes.push(key);
      seen.add(key);
    }
    expect(dupes, 'A district appears more than once in the same state').toEqual([]);
  });

  it('keeps same-named districts in different states distinguishable', () => {
    // Guards the fix for Kargil: it must not reappear as both "Jammu and
    // Kashmir" and "Ladakh". Real cross-state repeats (Aurangabad, Bilaspur,
    // Hamirpur, Junagadh, Raigarh) must still be present.
    const names = new Set(ALL_766_DISTRICTS.map((d) => d.name));
    for (const expected of ['Aurangabad', 'Bilaspur', 'Hamirpur', 'Junagadh', 'Raigarh']) {
      expect(names.has(expected), `${expected} should still exist`).toBe(true);
    }

    const kargil = ALL_766_DISTRICTS.filter((d) => d.name === 'Kargil');
    expect(kargil).toHaveLength(1);
    expect(kargil[0].state).toBe('Ladakh');
  });

  it('keeps every coordinate inside the Indian landmass bounding box', () => {
    const offenders = ALL_766_DISTRICTS.filter(
      (d) => d.lat < 6 || d.lat > 38 || d.lng < 68 || d.lng > 98
    ).map((d) => `${d.id} ${d.name} (${d.lat}, ${d.lng})`);
    expect(offenders).toEqual([]);
  });

  it('records finite, non-zero population for every district', () => {
    const offenders = ALL_766_DISTRICTS.filter(
      (d) => !Number.isFinite(d.population) || d.population <= 0
    ).map((d) => `${d.id} ${d.name}`);
    expect(offenders).toEqual([]);
  });

  it('does not produce NaN coordinates on any record', () => {
    const offenders = ALL_766_DISTRICTS.filter(
      (d) => Number.isNaN(d.lat) || Number.isNaN(d.lng)
    ).map((d) => d.id);
    expect(offenders).toEqual([]);
  });
});

describe('ALL_766_DISTRICTS — provenance', () => {
  it('contains no fabricated district records', () => {
    expect(byPrefix(SYNTHETIC_PREFIX).map((d) => d.id)).toEqual([]);
  });

  it('has no district name suffixed "Central"', () => {
    // The signature of the padding records ("Krishna Central", "Banka Central").
    // A district in India is not called "X Central".
    const fabricated = ALL_766_DISTRICTS.filter((d) => / Central$/.test(d.name)).map(
      (d) => `${d.id} ${d.name}`
    );
    expect(fabricated, 'Fabricated "… Central" records are present').toEqual([]);
  });

  it('counts every record under a declared, audited provenance prefix', () => {
    const undeclared = ALL_766_DISTRICTS.filter(
      (d) => !d.id.startsWith(REAL_PREFIX) && !d.id.startsWith(MODIFIED_PREFIX)
    ).map((d) => d.id);
    expect(undeclared).toEqual([]);
  });

  it('exposes the real vs modified split so the UI cannot overstate coverage', () => {
    expect({
      real: byPrefix(REAL_PREFIX).length,
      modified: byPrefix(MODIFIED_PREFIX).length,
      synthesized: byPrefix(SYNTHETIC_PREFIX).length,
    }).toEqual({ real: 593, modified: 117, synthesized: 0 });
  });
});
