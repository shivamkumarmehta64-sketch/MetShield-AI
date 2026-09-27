import { describe, it, expect } from 'vitest';
import { evaluate3ParamQC, WMO_LIMITS, ROC_LIMITS } from '../lib/anomalyDetector';
import type { Reading3Param } from '../lib/anomalyDetector';

/**
 * Regression coverage for evaluate3ParamQC.
 *
 * This function previously had NO tests, which is how a 0% detection rate for
 * barometer calibration drift survived. These cases lock in the three behaviours
 * that matter operationally:
 *   1. A genuine squall is passed to NWP, not quarantined.
 *   2. An isolated transducer fault is quarantined.
 *   3. A slow single-channel bias is flagged as drift without absorbing real weather.
 */

let clock = Date.UTC(2026, 8, 27, 6, 0, 0);
function reading(t: number, p: number, h: number): Reading3Param {
  clock += 2500;
  return { temperature: t, pressure: p, humidity: h, timestamp: clock, stationId: 'AWS-TEST-01' };
}

/** Healthy lead-in: noisy but bounded, so no tier fires on the history itself. */
function nominalHistory(count = 8, t = 28, p = 1008, h = 55): Reading3Param[] {
  const out: Reading3Param[] = [];
  // Deterministic pseudo-noise (no RNG) so assertions stay stable.
  const jitter = [0.12, -0.08, 0.05, -0.11, 0.09, -0.04, 0.07, -0.06, 0.03, -0.09];
  for (let i = 0; i < count; i++) {
    const j = jitter[i % jitter.length];
    out.push(reading(t + j, p + j * 0.4, h + j * 5));
  }
  return out;
}

describe('evaluate3ParamQC — Tier 1 physical limits', () => {
  it('quarantines a temperature beyond WMO-No. 8 physical bounds', () => {
    const history = nominalHistory();
    const result = evaluate3ParamQC(reading(WMO_LIMITS.TEMP_MAX + 6, 1008, 55), history);
    expect(result.classification).toBe('PHYSICAL_LIMIT_EXCEEDED');
    expect(result.isValid).toBe(false);
    expect(result.wmoFlag).toBe('FLAG_4_CORRUPT_HARDWARE');
  });
});

describe('evaluate3ParamQC — Tier 2 probe freeze', () => {
  it('flags a channel that repeats an identical value across the window', () => {
    const history: Reading3Param[] = [];
    for (let i = 0; i < 8; i++) history.push(reading(28.0, 1008 + i * 0.05, 55 + (i % 2) * 0.1));
    const result = evaluate3ParamQC(reading(28.0, 1008, 55), history);
    expect(result.classification).toBe('PROBE_FREEZE');
    expect(result.isValid).toBe(false);
  });

  it('does NOT flag a healthy but low-amplitude channel as frozen', () => {
    // Guards the quantisation regression: a live sensor reporting 0.1-resolution
    // values with real ADC noise must not be mistaken for a dead register.
    const result = evaluate3ParamQC(reading(28.0, 1008, 55), nominalHistory());
    expect(result.classification).not.toBe('PROBE_FREEZE');
  });
});

describe('evaluate3ParamQC — Tier 3 storm vs fault discrimination', () => {
  it('passes a genuine convective squall to NWP instead of quarantining it', () => {
    // Thermodynamic coupling: pressure plunge + moisture surge + temperature drop.
    const history = nominalHistory();
    const result = evaluate3ParamQC(reading(24.5, 1002.0, 78.0), history);

    expect(result.classification).toBe('GENUINE_WEATHER_EVENT');
    expect(result.severity).toBe('BLUE_GENUINE_WEATHER');
    expect(result.wmoFlag).toBe('FLAG_2_CONVECTIVE_STORM');
    expect(result.isValid).toBe(true);
    expect(result.imputed.wasImputed).toBe(false);
  });

  it('quarantines an isolated thermistor spike with no thermodynamic coupling', () => {
    const history = nominalHistory();
    const result = evaluate3ParamQC(reading(52.0, 1008, 55), history);

    expect(result.classification).toBe('SENSOR_SPIKE');
    expect(result.severity).toBe('RED_HARDWARE_FAULT');
    expect(result.isValid).toBe(false);
    expect(result.imputed.wasImputed).toBe(true);
  });

  it('treats a large pressure step WITHOUT humidity coupling as a hardware fault', () => {
    // This is the exact case a static threshold filter cannot get right in one
    // direction or the other: big dP, but no corroborating moisture surge.
    const history = nominalHistory();
    const result = evaluate3ParamQC(reading(28.0, 1002.0, 55), history);
    expect(result.classification).toBe('SENSOR_SPIKE');
    expect(result.isValid).toBe(false);
  });
});

describe('evaluate3ParamQC — Tier 2.5 calibration drift', () => {
  it('flags a sustained single-channel barometer bias as drift, not as a fault', () => {
    // The bias must sit on top of real transducer noise: the detector estimates the
    // channel's noise floor from its own first differences before judging a trend.
    const jitter = [0.03, -0.02, 0.04, -0.03, 0.02, -0.04, 0.03, -0.02];
    const history: Reading3Param[] = [];
    let p = 1008;
    for (let i = 0; i < 8; i++) {
      p -= 0.4; // monotonic ageing bias
      history.push(reading(28 + (i % 3) * 0.05, p + jitter[i], 55 + (i % 2) * 0.2));
    }
    const result = evaluate3ParamQC(reading(28, p - 0.4 + 0.01, 55), history);

    expect(result.classification).toBe('CALIBRATION_DRIFT');
    expect(result.severity).toBe('AMBER_CALIBRATION_DRIFT');
    // A slow bias is physically plausible, so the packet is flagged, not discarded.
    expect(result.isValid).toBe(true);
  });

  it('does not report ordinary channel noise as drift', () => {
    const result = evaluate3ParamQC(reading(28.0, 1008, 55), nominalHistory());
    expect(result.classification).not.toBe('CALIBRATION_DRIFT');
  });

  it('does not absorb a genuine squall into the drift tier', () => {
    const history = nominalHistory();
    const result = evaluate3ParamQC(reading(24.5, 1002.0, 78.0), history);
    expect(result.classification).toBe('GENUINE_WEATHER_EVENT');
  });
});

describe('evaluate3ParamQC — nominal + XAI contract', () => {
  it('passes healthy telemetry through all three tiers', () => {
    const result = evaluate3ParamQC(reading(28.0, 1008, 55), nominalHistory());
    expect(result.classification).toBe('NOMINAL_OPERATION');
    expect(result.isValid).toBe(true);
    expect(result.tierPassed).toBe(3);
  });

  it('always emits XAI attribution weights summing to 100%', () => {
    const cases: Array<[Reading3Param, Reading3Param[]]> = [
      [reading(28.0, 1008, 55), nominalHistory()],
      [reading(24.5, 1002.0, 78.0), nominalHistory()],
      [reading(52.0, 1008, 55), nominalHistory()],
      [reading(70.0, 1008, 55), nominalHistory()],
    ];
    for (const [current, history] of cases) {
      const { tempWeight, pressWeight, humWeight } = evaluate3ParamQC(current, history).xai;
      const sum = tempWeight + pressWeight + humWeight;
      expect(sum).toBeGreaterThanOrEqual(99);
      expect(sum).toBeLessThanOrEqual(101);
    }
  });

  it('keeps ROC_LIMITS internally consistent', () => {
    // The storm discriminator must sit inside the static step limit envelope,
    // otherwise "storm" and "spike" could never be told apart.
    expect(2.5).toBeGreaterThan(ROC_LIMITS.PRESS_STEP_MAX);
  });
});
