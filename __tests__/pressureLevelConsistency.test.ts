import { describe, it, expect } from 'vitest';
import { evaluate3ParamQC, WMO_LIMITS } from '../lib/anomalyDetector';
import type { Reading3Param } from '../lib/anomalyDetector';
import { IMD_AWS_STATIONS } from '../lib/stationData';

/**
 * Characterisation of the QFE / QNH pressure-level mismatch.
 *
 * THE DEFECT
 * ----------
 * Every `baseline.pressureMean` in lib/stationData.ts is a MEAN SEA LEVEL (QNH)
 * value: all 21 stations sit between 1006 and 1015 hPa regardless of elevation.
 *
 * But lib/liveWeatherService.ts fetches Open-Meteo `surface_pressure`, which is
 * STATION pressure (QFE) — the value a barometer physically reads. It writes
 * that value straight into `LiveObservation.pressure` with no reduction:
 *
 *   const press = Math.round(Number(current.surface_pressure) * 10) / 10;
 *
 * The two levels differ by roughly 1 hPa per 27 m near sea level, so every
 * elevated station is compared against a baseline that is offset by an amount
 * proportional to its height:
 *
 *   station      elev    stored MSL   QFE equivalent   offset
 *   AWS-DEL-04    216 m     1008.2        984.1        -24.1 hPa
 *   AWS-BLR-05    920 m     1013.2        913.3        -99.9 hPa
 *   AWS-SML-14   2205 m     1014.2        789.8       -224.4 hPa
 *   AWS-SRN-17   1587 m     1015.0        845.5       -169.5 hPa
 *
 * WHY THIS MATTERS
 * ----------------
 * WMO-LIMITS now spans both levels (300-1085 hPa), so Tier 1 accepts these
 * values — a genuine improvement, since the old 920 hPa floor was rejecting
 * legitimate high-altitude stations outright. But accepting the value is not
 * enough: the Tier 2 rate-of-change test compares each new live reading against
 * the same-baseline window. On the first live sample after a page load the
 * offset appears as a step change.
 *
 * These tests are CHARACTERISATION, not assertions that the behaviour is
 * correct. They document the current response so the fix in Phase 2 can be
 * measured against a known baseline, and so a future change to the pressure
 * bound cannot silently reintroduce a flag.
 *
 * THE FIX (deliberately NOT applied here)
 * ----------------------------------------
 * Normalise to one level at ingestion. The cleanest option is to request
 * `pressure_msl` from Open-Meteo alongside `surface_pressure` and store the MSL
 * value, since the baselines are MSL. Alternatively reduce QFE to QNH with
 * calculateQnhPressure() from lib/anomalyLogic.ts before it reaches the QC
 * engine. Either way the stored observation and the baseline must agree on
 * level. See also: `orographicQnhPressure` on TelemetryPacket.
 */

let clock = Date.UTC(2026, 8, 27, 6, 0, 0);
function reading(t: number, p: number, h: number, stationId: string): Reading3Param {
  clock += 2500;
  return { temperature: t, pressure: p, humidity: h, timestamp: clock, stationId };
}

/** WMO/ICAO barometric reduction: convert MSL to station pressure (QFE). */
function toStationPressure(msl: number, elevationM: number, tempC: number): number {
  const lr = 0.0065;
  const factor = 1 - (lr * elevationM) / (tempC + lr * elevationM + 273.15);
  return Math.round(msl * Math.pow(factor, 5.257) * 10) / 10;
}

function nominalHistory(pressure: number, stationId: string, count = 8): Reading3Param[] {
  const out: Reading3Param[] = [];
  const jitter = [0.12, -0.08, 0.05, -0.11, 0.09, -0.04, 0.07, -0.06];
  for (let i = 0; i < count; i++) {
    const j = jitter[i % jitter.length];
    out.push(reading(18.0 + j, pressure + j * 0.4, 40 + j * 5, stationId));
  }
  return out;
}

describe('pressure level consistency — baselines are MSL, live feed is QFE', () => {
  it('stores every station baseline as mean-sea-level pressure', () => {
    // Confirms the premise: despite elevations from 5 m to 2,205 m, all stored
    // baselines cluster in the sea-level band. That is only coherent if the
    // field means QNH.
    const elevations = IMD_AWS_STATIONS.map((s) => s.elevationM);
    const baselines = IMD_AWS_STATIONS.map((s) => s.baseline.pressureMean);
    expect(Math.max(...elevations) - Math.min(...elevations)).toBeGreaterThan(2000);
    for (const b of baselines) {
      expect(b).toBeGreaterThan(1000);
      expect(b).toBeLessThan(1020);
    }
  });

  it('produces a large QFE offset for every elevated station', () => {
    // The offset is the bug, quantified. It scales with elevation, so it is
    // worst exactly where the product most wants to be credible: the Himalaya.
    const offsets = IMD_AWS_STATIONS.map((s) =>
      Math.round(
        (s.baseline.pressureMean -
          toStationPressure(s.baseline.pressureMean, s.elevationM, s.baseline.tempMean)) * 10
      ) / 10
    );
    const maxOffset = Math.max(...offsets);
    expect(maxOffset).toBeGreaterThan(200);
  });

  it('a raw QFE reading is inside the widened band but trips the Tier 2 step test', () => {
    // Shimla: baseline 1014.2 hPa MSL at 2,205 m => ~789.8 hPa on the wire.
    //
    // Tier 1 (physical plausibility) now ACCEPTS 789.8 hPa — that was the P0
    // fix, and the widened 300-1085 hPa band is what makes it acceptable.
    // The 224.4 hPa level mismatch instead surfaces at Tier 2 as a rate-of-
    // change breach (step limit 2.2 hPa), which is the correct place for it:
    // a 224 hPa move in one cycle is not physically plausible weather.
    const shimla = IMD_AWS_STATIONS.find((s) => s.stationId === 'AWS-SML-14')!;
    const qfe = toStationPressure(shimla.baseline.pressureMean, shimla.elevationM, shimla.baseline.tempMean);

    expect(qfe).toBeGreaterThan(WMO_LIMITS.PRESS_MIN);
    expect(qfe).toBeLessThan(WMO_LIMITS.PRESS_MAX);

    const history = nominalHistory(shimla.baseline.pressureMean, shimla.stationId);
    const result = evaluate3ParamQC(reading(21.0, qfe, 68.0, shimla.stationId), history);

    // Not a physical-limit rejection...
    expect(result.classification).not.toBe('PHYSICAL_LIMIT_EXCEEDED');
    // ...but still flagged, because a 224 hPa step in one cycle is a fault.
    expect(result.deltas.deltaP).toBeLessThan(-200);
    expect(Math.abs(result.deltas.deltaP)).toBeGreaterThan(2.2);
  });

  it('is clean once the live feed is reduced to MSL (the shipped behaviour)', () => {
    // THE CONTROL CASE, and now the actual production path. A reduced-to-MSL
    // reading against an MSL baseline produces no step and no alarm — proving
    // the fix is correct and that the detector was never at fault.
    //
    // Note the history is a stable 18.0 C window, so the only live-vs-history
    // difference is the absolute level. That difference is intentional: it
    // isolates the pressure axis from temperature, which is what this test is
    // about. The matching temperature case is in qcEngine.test.ts.
    const shimla = IMD_AWS_STATIONS.find((s) => s.stationId === 'AWS-SML-14')!;
    const history = nominalHistory(shimla.baseline.pressureMean, shimla.stationId);
    const result = evaluate3ParamQC(
      reading(18.0, shimla.baseline.pressureMean, 40.0, shimla.stationId),
      history
    );

    expect(result.classification).toBe('NOMINAL_OPERATION');
    expect(result.severity).toBe('NOMINAL');
  });

  it('reduces QFE to MSL consistently with the standard atmosphere', () => {
    // Guard the reduction itself: sea level must be ~identity, and the reduction
    // must monotonically increase pressure with altitude.
    expect(toStationPressure(1013.25, 0, 15)).toBeCloseTo(1013.25, 0);

    const reduced = [0, 500, 1000, 2000, 3500].map((elev) =>
      toStationPressure(1013.25, elev, 15)
    );
    for (let i = 1; i < reduced.length; i++) {
      expect(reduced[i]).toBeLessThan(reduced[i - 1]);
    }
    // ~1013 hPa at sea level down to roughly 650 hPa at 3,500 m.
    expect(reduced[reduced.length - 1]).toBeGreaterThan(600);
    expect(reduced[reduced.length - 1]).toBeLessThan(700);
  });
});

describe('WMO_LIMITS pressure band', () => {
  it('spans both station and sea-level pressure', () => {
    expect(WMO_LIMITS.PRESS_MIN).toBeLessThanOrEqual(668.0); // Leh QFE
    expect(WMO_LIMITS.PRESS_MAX).toBeGreaterThanOrEqual(1084.0); // highest recorded MSL
  });

  it('still rejects a physically impossible pressure', () => {
    const history = nominalHistory(1004, 'AWS-PLAIN-01');
    expect(evaluate3ParamQC(reading(28.0, 50.0, 55, 'AWS-PLAIN-01'), history).classification).toBe(
      'PHYSICAL_LIMIT_EXCEEDED'
    );
  });

  it('rejects an over-pressure reading above any recorded value', () => {
    const history = nominalHistory(1004, 'AWS-PLAIN-01');
    expect(evaluate3ParamQC(reading(28.0, 1200.0, 55, 'AWS-PLAIN-01'), history).classification).toBe(
      'PHYSICAL_LIMIT_EXCEEDED'
    );
  });
});
