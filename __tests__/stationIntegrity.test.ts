import { describe, it, expect } from 'vitest';
import { evaluate3ParamQC, WMO_LIMITS } from '../lib/anomalyDetector';
import type { Reading3Param } from '../lib/anomalyDetector';
import { IMD_AWS_STATIONS, getStationProfile, findStationProfile } from '../lib/stationData';
import { FEATURED_OBSERVATORIES } from '../lib/constants';

/**
 * Integrity coverage for station data and the pressure plausibility floor.
 *
 * Two real defects are pinned here:
 *
 *  1. `WMO_LIMITS.PRESS_MIN` is 920 hPa — a sea-level-only bound. Leh sits at
 *     668.0 hPa and Shimla at 782.4 hPa in this repo's OWN data, so both real
 *     high-altitude stations were being flagged RED_HARDWARE_FAULT / quarantined
 *     while perfectly healthy. No test covered this, so it shipped.
 *
 *  2. `getStationProfile` silently falls back to Safdarjung (IMD_AWS_STATIONS[0])
 *     for any unknown id, so a typo or an unregistered station returns Delhi data
 *     with no error. That is how the `AWS-JOD-08` / `AWS-CHE-10` benchmark
 *     records in lib/datasetParser.ts were misattributed.
 *
 * Tests marked FAILS TODAY are the specification for the Phase 2 fix.
 */

let clock = Date.UTC(2026, 8, 27, 6, 0, 0);
function reading(t: number, p: number, h: number, stationId: string): Reading3Param {
  clock += 2500;
  return { temperature: t, pressure: p, humidity: h, timestamp: clock, stationId };
}

/**
 * Build a healthy, noisy nominal window AT a given pressure level.
 * The absolute level must not change the detector's verdict — only the
 * rate-of-change and relative structure should matter.
 */
function nominalHistoryAtPressure(
  pressure: number,
  stationId: string,
  count = 8
): Reading3Param[] {
  const out: Reading3Param[] = [];
  const jitter = [0.12, -0.08, 0.05, -0.11, 0.09, -0.04, 0.07, -0.06];
  for (let i = 0; i < count; i++) {
    const j = jitter[i % jitter.length];
    out.push(reading(18.0 + j, pressure + j * 0.4, 40 + j * 5, stationId));
  }
  return out;
}

describe('WMO_LIMITS — physical bounds must admit real high-altitude stations', () => {
  it('does NOT quarantine a healthy Leh-equivalent reading at 668 hPa', () => {
    // FAILS TODAY: 668.0 < PRESS_MIN (920.0) => PHYSICAL_LIMIT_EXCEEDED.
    const history = nominalHistoryAtPressure(668.0, 'AWS-LEH-14');
    const result = evaluate3ParamQC(reading(18.0, 668.0, 40, 'AWS-LEH-14'), history);

    expect(result.wmoFlag).not.toBe('FLAG_4_CORRUPT_HARDWARE');
    expect(result.classification).not.toBe('PHYSICAL_LIMIT_EXCEEDED');
    expect(result.severity).not.toBe('RED_HARDWARE_FAULT');
  });

  it('does NOT quarantine a healthy Shimla-equivalent reading at 782 hPa', () => {
    // FAILS TODAY: 782.4 < PRESS_MIN (920.0).
    const history = nominalHistoryAtPressure(782.4, 'AWS-SHM-11');
    const result = evaluate3ParamQC(reading(18.0, 782.4, 40, 'AWS-SHM-11'), history);

    expect(result.wmoFlag).not.toBe('FLAG_4_CORRUPT_HARDWARE');
    expect(result.severity).not.toBe('RED_HARDWARE_FAULT');
  });

  it('still quarantines a genuinely impossible pressure reading', () => {
    // The lower bound must be widened, not removed. 100 hPa is below any
    // physical altitude on Earth and must remain a hard fault.
    const history = nominalHistoryAtPressure(1004, 'AWS-PLAIN-01');
    const result = evaluate3ParamQC(reading(28.0, 100.0, 55, 'AWS-PLAIN-01'), history);
    expect(result.classification).toBe('PHYSICAL_LIMIT_EXCEEDED');
  });

  it('admits every pressure level present in this repo own featured data', () => {
    // This is the cross-file consistency check that would have caught the bug:
    // every station the product advertises must survive its own plausibility gate.
    const rejected = FEATURED_OBSERVATORIES.filter(
      (o) => o.press < WMO_LIMITS.PRESS_MIN || o.press > WMO_LIMITS.PRESS_MAX
    ).map((o) => `${o.id} ${o.city} @ ${o.press} hPa`);

    // FAILS TODAY: AWS-LEH-14 (668.0) and AWS-SHM-11 (782.4) are below the floor.
    expect(rejected, 'Advertised stations are rejected by our own plausibility limits').toEqual([]);
  });
});

describe('IMD_AWS_STATIONS — registry integrity', () => {
  it('has no duplicate station ids', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const s of IMD_AWS_STATIONS) {
      if (seen.has(s.stationId)) dupes.push(s.stationId);
      seen.add(s.stationId);
    }
    expect(dupes).toEqual([]);
  });

  it('does NOT hand-maintain a second station list in lib/constants.ts', () => {
    // FEATURED_OBSERVATORIES used to be a hand-typed array carrying a DIFFERENT
    // pressure convention from the registry: Bengaluru 918.2 hPa here vs
    // 1013.2 hPa in stationData.ts, plus Shimla 782.4 and Leh 668.0 as station
    // pressure (QFE) against the registry's sea-level (QNH) values. It also
    // listed AWS-SHM-11 / AWS-LEH-14 / AWS-CHE-15, which are not registered
    // station ids at all.
    //
    // It is now DERIVED from IMD_AWS_STATIONS, so every featured value must
    // match the registry exactly. This asserts the derivation holds.
    for (const o of FEATURED_OBSERVATORIES) {
      const s = IMD_AWS_STATIONS.find((x) => x.stationId === o.id);
      expect(s, `${o.id} is featured but not registered`).toBeDefined();
      expect(o.press).toBe(s!.baseline.pressureMean);
      expect(o.elev).toBe(s!.elevationM);
      expect(o.wmo).toBe(s!.wmoBlockNo);
      expect(o.temp).toBe(s!.baseline.tempMean);
      expect(o.hum).toBe(s!.baseline.humidityMean);
    }
  });

  it('keeps every featured pressure on one consistent level (MSL)', () => {
    // The old list mixed QFE and QNH. A single level means the whole registry
    // sits in the sea-level band, and a station-pressure value would be a bug.
    for (const o of FEATURED_OBSERVATORIES) {
      expect(o.press).toBeGreaterThan(1000);
      expect(o.press).toBeLessThan(1020);
    }
  });

  it('gives every station a finite pressure baseline', () => {
    const offenders = IMD_AWS_STATIONS.filter(
      (s) => !Number.isFinite(s.baseline?.pressureMean) || (s.baseline?.pressureMean ?? 0) <= 0
    ).map((s) => s.stationId);
    expect(offenders).toEqual([]);
  });

  it('gives every station a finite elevation', () => {
    // The district registry carries no elevation field at all, so every district
    // is currently treated as 200 m ASL — which is what makes the high-altitude
    // heatwave and pressure bugs unfixable without a data change.
    const offenders = IMD_AWS_STATIONS.filter(
      (s) => !Number.isFinite(s.elevationM) || s.elevationM <= 0
    ).map((s) => s.stationId);
    expect(offenders).toEqual([]);
  });
});

describe('station lookup — must fail loudly, not substitute another station', () => {
  it('returns undefined for an unregistered station id', () => {
    // FAILS TODAY: getStationProfile falls back to IMD_AWS_STATIONS[0] (Safdarjung).
    const result = getStationProfile('AWS-DOES-NOT-EXIST-99');
    expect(result).toBeUndefined();
  });

  it('returns undefined for the fabricated benchmark station ids', () => {
    // AWS-JOD-08 and AWS-CHE-10 are used by AUTHENTIC_IMD_BENCHMARKS in
    // lib/datasetParser.ts but are not registered stations.
    expect(getStationProfile('AWS-JOD-08')).toBeUndefined();
    expect(getStationProfile('AWS-CHE-10')).toBeUndefined();
  });

  it('agrees with the safe findStationProfile for a known station', () => {
    const id = 'AWS-DEL-04';
    expect(getStationProfile(id)?.stationId).toBe(findStationProfile(id)?.stationId);
  });

  it('still resolves a genuinely registered station', () => {
    expect(getStationProfile('AWS-DEL-04')?.stationId).toBe('AWS-DEL-04');
  });
});
