/**
 * Metshield AI — NAWS-MetShield v4.2
 * Three-Tier Quality Control (QC) & Thermodynamic Storm vs. Fault Discrimination Engine
 * Standards Compliance: WMO-No. 8 Guide to Instruments and Methods of Observation
 */

export interface Reading3Param {
  temperature: number;
  pressure: number;
  humidity: number;
  timestamp: number;
  stationId?: string;
}

export type AnomalySeverity = 'NOMINAL' | 'BLUE_GENUINE_WEATHER' | 'AMBER_PROBE_FREEZE' | 'AMBER_CALIBRATION_DRIFT' | 'RED_HARDWARE_FAULT';

export interface XAIAttribution {
  tempWeight: number; // 0 - 100%
  pressWeight: number; // 0 - 100%
  humWeight: number; // 0 - 100%
  primaryParameter: 'temperature' | 'pressure' | 'humidity' | 'none';
  diagnosticExplanation: string;
}

export interface QCValidationResult {
  isValid: boolean;
  tierPassed: 1 | 2 | 3;
  severity: AnomalySeverity;
  classification:
    | 'NOMINAL_OPERATION'
    | 'GENUINE_WEATHER_EVENT'
    | 'HARDWARE_FAULT'
    | 'SENSOR_SPIKE'
    | 'PROBE_FREEZE'
    | 'CALIBRATION_DRIFT'
    | 'PHYSICAL_LIMIT_EXCEEDED';
  wmoFlag: 'FLAG_1_GOOD' | 'FLAG_2_CONVECTIVE_STORM' | 'FLAG_3_SUSPECT' | 'FLAG_4_CORRUPT_HARDWARE';
  alertBadge: {
    label: string;
    color: 'emerald' | 'blue' | 'amber' | 'rose';
    description: string;
  };
  raw: {
    temperature: number;
    pressure: number;
    humidity: number;
  };
  imputed: {
    temperature: number;
    pressure: number;
    humidity: number;
    wasImputed: boolean;
  };
  deltas: {
    deltaT: number;
    deltaP: number;
    deltaRH: number;
  };
  xai: XAIAttribution;
  recommendedAction: string;
}

// ─── TIER 1: WMO-No. 8 Plausibility Limits ───
export const WMO_LIMITS = {
  TEMP_MIN: -10.0, // °C
  TEMP_MAX: 55.0,  // °C
  /**
   * Pressure plausibility floor, in hPa.
   *
   * PREVIOUSLY 920.0 — a sea-level-only bound. That quarantined every real
   * high-altitude station in this repo's own registry: Leh (3,514 m, 668.0 hPa)
   * and Shimla (2,205 m, 782.4 hPa) both came back FLAG_4_CORRUPT_HARDWARE
   * while perfectly healthy.
   *
   * 300.0 hPa is the pressure at the summit of Everest (~8,848 m) and is below
   * anything an Indian station can physically report. The upper bound is the
   * highest sea-level pressure ever recorded (~1,084 hPa, Mongolia).
   *
   * NOTE ON LEVEL: this range deliberately admits BOTH station pressure (QFE,
   * what a barometer physically reads, and what liveWeatherService fetches via
   * Open-Meteo `surface_pressure`) and sea-level-reduced pressure (QNH/MSL,
   * what every baseline in lib/stationData.ts is expressed in). Tier 1 is a
   * gross-error gate, not a level discriminator, so spanning both is correct.
   * The QFE/QNH distinction is handled by calculateQnhPressure() in
   * lib/anomalyLogic.ts, which is called before imputation and stored on the
   * packet as `orographicQnhPressure`.
   */
  PRESS_MIN: 300.0, // hPa — ~8,848 m summit
  PRESS_MAX: 1085.0, // hPa — highest recorded sea-level pressure
  HUM_MIN: 5.0,    // %
  HUM_MAX: 100.0,  // %
};

// ─── TIER 2: Rate-of-Change & Persistence Limits ───
export const ROC_LIMITS = {
  TEMP_STEP_MAX: 8.0, // °C per cycle
  PRESS_STEP_MAX: 2.2, // hPa per cycle
  HUM_STEP_MAX: 18.0, // % per cycle
  FREEZE_MIN_CYCLES: 6,
  FREEZE_VARIANCE_THRESHOLD: 0.001,
  /**
   * Peak-to-peak window range below which a channel counts as physically static.
   * Telemetry arrives quantised to 0.1, so a live sensor does not repeat an identical
   * reading for FREEZE_MIN_CYCLES consecutive cycles. A pure variance threshold is
   * unreliable at that quantisation and produced spurious "probe freeze" alarms on
   * healthy channels — measured at ~6% false-alarm rate by scripts/benchmark-detector.ts.
   */
  FREEZE_RANGE_THRESHOLD: 0.05,
  /**
   * Drift significance, in units of the channel's OWN measured noise.
   *
   * A fixed absolute threshold cannot work across channels: 0.8 hPa is a large
   * excursion for a barometer (σ≈0.15) but an unremarkable one for a hygrometer
   * (σ≈1.5). The test is therefore self-calibrating — the noise floor is estimated
   * from the window's own first differences, and the cumulative move must clear it
   * by this many standard deviations.
   */
  DRIFT_SIGMA_MULTIPLE: 2.5,
  /** Fraction of consecutive window steps that must share the drift sign. */
  DRIFT_MONOTONIC_RATIO: 0.75,
};

/**
 * Peak-to-peak range across a window. Used instead of variance for the freeze test
 * because telemetry is quantised to 0.1 and variance thresholds misfire at that scale.
 */
function peakToPeakRange(values: number[]): number {
  if (values.length < 2) return Number.POSITIVE_INFINITY;
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

/**
 * Detects a sustained one-way bias across a window — the signature of a slowly
 * ageing transducer rather than a physical event.
 *
 * Self-calibrating: the channel's noise floor is estimated from the standard
 * deviation of its own first differences, then the cumulative move is required to
 * clear that floor by DRIFT_SIGMA_MULTIPLE. Returns null when the move is
 * indistinguishable from ordinary channel noise.
 */
function detectMonotonicDrift(series: number[]): { cumulative: number; monotonicRatio: number; sigmaMultiple: number } | null {
  if (series.length < 3) return null;

  const deltas: number[] = [];
  for (let i = 1; i < series.length; i++) deltas.push(series[i] - series[i - 1]);

  const cumulative = series[series.length - 1] - series[0];

  // Sample standard deviation of the first differences = this channel's noise floor.
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance = deltas.reduce((acc, d) => acc + Math.pow(d - mean, 2), 0) / (deltas.length - 1);
  const noiseSd = Math.sqrt(variance);

  // A perfectly constant channel has no estimable noise floor; leave it to the freeze test.
  if (noiseSd === 0) return null;

  // Expected magnitude of the cumulative move if the channel were pure noise.
  const noiseFloor = noiseSd * Math.sqrt(deltas.length);
  const sigmaMultiple = Math.abs(cumulative) / noiseFloor;
  if (sigmaMultiple < ROC_LIMITS.DRIFT_SIGMA_MULTIPLE) return null;

  const sign = cumulative > 0 ? 1 : -1;
  const nonZero = deltas.filter((d) => d !== 0).length;
  const agreeing = deltas.filter((d) => d !== 0 && Math.sign(d) === sign).length;
  const monotonicRatio = nonZero === 0 ? 0 : agreeing / nonZero;

  return { cumulative, monotonicRatio, sigmaMultiple };
}

/**
 * Windowed mean of the supplied history, rounded to 0.1, falling back to
 * `fallback` when there is no history.
 *
 * RENAMED from `calculateGaussianWMA`. The name claimed Gaussian weighting but
 * the implementation is a flat arithmetic mean — there are no Gaussian
 * weights anywhere in this file. A function name that misdescribes its
 * algorithm is a documentation bug that outlives any single comment, and this
 * one was quoted as "5-step Gaussian WMA" across the UI, the docs, and the API
 * assistant's canned reply.
 */
function windowedMean(history: number[], fallback: number): number {
  if (!history.length) return fallback;
  const sum = history.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / history.length) * 10) / 10;
}

/**
 * Evaluates a single 3-parameter reading against the Three-Tier QC and Thermodynamic Discrimination Engine
 */
export function evaluate3ParamQC(
  current: Reading3Param,
  history: Reading3Param[] = []
): QCValidationResult {
  const { temperature: T, pressure: P, humidity: RH } = current;

  // Past 6 cycles for rate-of-change and freeze checks
  const recentHistory = history.slice(-6);
  const prev = recentHistory.length > 0 ? recentHistory[recentHistory.length - 1] : null;

  const deltaT = prev ? Math.round((T - prev.temperature) * 10) / 10 : 0;
  const deltaP = prev ? Math.round((P - prev.pressure) * 10) / 10 : 0;
  const deltaRH = prev ? Math.round((RH - prev.humidity) * 10) / 10 : 0;

  // Moving average history buffers
  const validTempHistory = history.map(h => h.temperature).filter(v => v >= WMO_LIMITS.TEMP_MIN && v <= WMO_LIMITS.TEMP_MAX);
  const validPressHistory = history.map(h => h.pressure).filter(v => v >= WMO_LIMITS.PRESS_MIN && v <= WMO_LIMITS.PRESS_MAX);
  const validHumHistory = history.map(h => h.humidity).filter(v => v >= WMO_LIMITS.HUM_MIN && v <= WMO_LIMITS.HUM_MAX);

  const imputedT = windowedMean(validTempHistory, T);
  const imputedP = windowedMean(validPressHistory, P);
  const imputedRH = windowedMean(validHumHistory, RH);

  // -------------------------------------------------------------
  // TIER 1: Physical Climatological Limits (WMO-No. 8)
  // -------------------------------------------------------------
  const tLimitBreached = T < WMO_LIMITS.TEMP_MIN || T > WMO_LIMITS.TEMP_MAX;
  const pLimitBreached = P < WMO_LIMITS.PRESS_MIN || P > WMO_LIMITS.PRESS_MAX;
  const rhLimitBreached = RH < WMO_LIMITS.HUM_MIN || RH > WMO_LIMITS.HUM_MAX;

  if (tLimitBreached || pLimitBreached || rhLimitBreached) {
    const weights = computeXAIWeights(
      tLimitBreached ? 80 : 10,
      pLimitBreached ? 80 : 10,
      rhLimitBreached ? 80 : 10
    );

    return {
      isValid: false,
      tierPassed: 1,
      severity: 'RED_HARDWARE_FAULT',
      classification: 'PHYSICAL_LIMIT_EXCEEDED',
      wmoFlag: 'FLAG_4_CORRUPT_HARDWARE',
      alertBadge: {
        label: 'WMO LIMIT BREACH',
        color: 'rose',
        description: 'Sensor reading exceeds physical climatological bounds (WMO-No. 8).',
      },
      raw: { temperature: T, pressure: P, humidity: RH },
      imputed: {
        temperature: tLimitBreached ? imputedT : T,
        pressure: pLimitBreached ? imputedP : P,
        humidity: rhLimitBreached ? imputedRH : RH,
        wasImputed: true,
      },
      deltas: { deltaT, deltaP, deltaRH },
      xai: {
        ...weights,
        diagnosticExplanation: `Physical Climatological Breach: The ${tLimitBreached ? `Temperature sensor ` : ''}${pLimitBreached ? `Barometer ` : ''}${rhLimitBreached ? `Humidity sensor ` : ''}is broadcasting values outside WMO limits. Hardware malfunction likely.`,
      },
      recommendedAction: 'Immediate transducer recalibration or probe replacement required at AWS node.',
    };
  }

  // -------------------------------------------------------------
  // TIER 2: Persistence & Rate of Change Check
  // -------------------------------------------------------------
  // Check for probe freeze (standard deviation < 0.001 over 6 cycles)
  if (recentHistory.length >= ROC_LIMITS.FREEZE_MIN_CYCLES) {
    const tSeries = [...recentHistory.map(h => h.temperature), T];
    const pSeries = [...recentHistory.map(h => h.pressure), P];
    const rhSeries = [...recentHistory.map(h => h.humidity), RH];

    const isTFrozen = peakToPeakRange(tSeries) <= ROC_LIMITS.FREEZE_RANGE_THRESHOLD;
    const isPFrozen = peakToPeakRange(pSeries) <= ROC_LIMITS.FREEZE_RANGE_THRESHOLD;
    const isRHFrozen = peakToPeakRange(rhSeries) <= ROC_LIMITS.FREEZE_RANGE_THRESHOLD;

    if (isTFrozen || isPFrozen || isRHFrozen) {
      const weights = computeXAIWeights(
        isTFrozen ? 70 : 15,
        isPFrozen ? 70 : 15,
        isRHFrozen ? 70 : 15
      );

      return {
        isValid: false,
        tierPassed: 2,
        severity: 'AMBER_PROBE_FREEZE',
        classification: 'PROBE_FREEZE',
        wmoFlag: 'FLAG_3_SUSPECT',
        alertBadge: {
          label: 'PROBE FLOAT LOCK',
          color: 'amber',
          description: 'Sensor probe frozen: Zero variance across 6 consecutive acquisition cycles.',
        },
        raw: { temperature: T, pressure: P, humidity: RH },
        imputed: {
          temperature: isTFrozen ? imputedT : T,
          pressure: isPFrozen ? imputedP : P,
          humidity: isRHFrozen ? imputedRH : RH,
          wasImputed: true,
        },
        deltas: { deltaT, deltaP, deltaRH },
        xai: {
          ...weights,
          diagnosticExplanation: `Sensor Physically Jammed: The ${isTFrozen ? 'Thermometer ' : ''}${isPFrozen ? 'Barometer ' : ''}${isRHFrozen ? 'Humidity probe ' : ''}is stuck on the exact same value for 6 cycles. Dispatch technician.`,
        },
        recommendedAction: 'Dispatch field engineer for mechanical inspection and sensor power cycling.',
      };
    }
  }

  // -------------------------------------------------------------
  // TIER 3: Thermodynamic Storm vs. Hardware Differentiator
  // -------------------------------------------------------------
  // Check rate-of-change spikes
  const isTempSpike = Math.abs(deltaT) > ROC_LIMITS.TEMP_STEP_MAX;
  const isPressStep = Math.abs(deltaP) > ROC_LIMITS.PRESS_STEP_MAX;
  const isHumStep = Math.abs(deltaRH) > ROC_LIMITS.HUM_STEP_MAX;

  // -------------------------------------------------------------
  // TIER 2.5: Slow Monotonic Calibration Drift
  // -------------------------------------------------------------
  // A slowly ageing transducer produces no single-cycle step, so the Tier 3 spike
  // test never sees it and the storm discriminator is irrelevant. It is visible only
  // as a sustained one-way trend across the analysis window.
  //
  // Two guards keep this from absorbing real weather:
  //  1. Any step breach on the arriving frame disqualifies the window (a squall steps).
  //  2. Exactly one channel must drift. Genuine atmospheric change moves temperature,
  //     pressure and humidity together; a failing transducer moves alone.
  if (!isTempSpike && !isPressStep && !isHumStep) {
    const windows: Array<{ channel: 'temperature' | 'pressure' | 'humidity'; series: number[] }> = [
      { channel: 'temperature', series: [...recentHistory.map((h) => h.temperature), T] },
      { channel: 'pressure', series: [...recentHistory.map((h) => h.pressure), P] },
      { channel: 'humidity', series: [...recentHistory.map((h) => h.humidity), RH] },
    ];

    const drifting = windows
      .map((w) => ({ channel: w.channel, drift: detectMonotonicDrift(w.series) }))
      .filter(
        (w): w is {
          channel: 'temperature' | 'pressure' | 'humidity';
          drift: { cumulative: number; monotonicRatio: number; sigmaMultiple: number };
        } => w.drift !== null && w.drift.monotonicRatio >= ROC_LIMITS.DRIFT_MONOTONIC_RATIO
      );

    if (drifting.length === 1) {
      const { channel, drift } = drifting[0];
      const cumulative = Math.round(drift.cumulative * 10) / 10;
      const perCycle = Math.round((drift.cumulative / Math.max(1, recentHistory.length)) * 100) / 100;
      const channelLabel =
        channel === 'pressure' ? 'Barometer' : channel === 'temperature' ? 'Thermistor' : 'Humidity probe';

      const weights = computeXAIWeights(
        channel === 'temperature' ? 70 : 10,
        channel === 'pressure' ? 70 : 10,
        channel === 'humidity' ? 70 : 10
      );

      return {
        // A slow bias is physically plausible, so the packet is not discarded —
        // it is flagged suspect and routed for recalibration.
        isValid: true,
        tierPassed: 2,
        severity: 'AMBER_CALIBRATION_DRIFT',
        classification: 'CALIBRATION_DRIFT',
        wmoFlag: 'FLAG_3_SUSPECT',
        alertBadge: {
          label: 'CALIBRATION DRIFT',
          color: 'amber',
          description: `Sustained monotonic bias on a single channel (~${perCycle} per cycle over ${recentHistory.length} cycles).`,
        },
        raw: { temperature: T, pressure: P, humidity: RH },
        imputed: {
          temperature: T,
          pressure: P,
          humidity: RH,
          wasImputed: false,
        },
        deltas: { deltaT, deltaP, deltaRH },
        xai: {
          ...weights,
          diagnosticExplanation: `${channelLabel} Calibration Drift: a sustained ${cumulative > 0 ? 'rising' : 'falling'} bias of ${Math.abs(cumulative)} (${channel === 'humidity' ? '%' : channel === 'pressure' ? 'hPa' : '°C'}) accumulated monotonically across the analysis window with no step discontinuity and no corroborating movement on the other channels. Consistent with transducer ageing rather than atmospheric forcing.`,
        },
        recommendedAction: 'Schedule NABL-traceable recalibration. Data retained for assimilation with a drift flag.',
      };
    }
  }

  // Genuine Weather Event rule: ΔP ≤ -2.5 hPa coupled with ΔRH ≥ +15%
  // Genuine Weather Event rule: ΔP ≤ -2.5 hPa coupled with ΔRH ≥ +15% and ΔT ≤ -0.5°C
  const isConvectiveStorm = deltaP <= -2.5 && deltaRH >= 15.0 && deltaT <= -0.5;

  if (isConvectiveStorm) {
    // Both pressure plunge and moisture surge occurred together (thermodynamically coupled)
    const weights = computeXAIWeights(20, 45, 35);
    return {
      isValid: true, // Data is genuine meteorology, do NOT discard
      tierPassed: 3,
      severity: 'BLUE_GENUINE_WEATHER',
      classification: 'GENUINE_WEATHER_EVENT',
      wmoFlag: 'FLAG_2_CONVECTIVE_STORM',
      alertBadge: {
        label: 'CONVECTIVE FRONT (STORM)',
        color: 'blue',
        description: 'Thermodynamic coupling confirmed (ΔP ≤ -2.5 hPa with ΔRH ≥ +15%). Genuine storm gust front.',
      },
      raw: { temperature: T, pressure: P, humidity: RH },
      imputed: {
        temperature: T,
        pressure: P,
        humidity: RH,
        wasImputed: false,
      },
      deltas: { deltaT, deltaP, deltaRH },
      xai: {
        ...weights,
        diagnosticExplanation: `Severe Convective Storm Confirmed: Deep barometric pressure plunge accompanied by a moisture surge. Genuine weather event; sensors are nominal.`,
      },
      recommendedAction: 'Relay high-priority severe convective storm alert to IMD State Meteorological Centre (SMC).',
    };
  }

  // Isolated Spike: Sudden step jump without thermodynamic coupling
  if (isTempSpike || isPressStep || isHumStep) {
    const rawTWeight = isTempSpike ? Math.abs(deltaT) * 15 : 5;
    const rawPWeight = isPressStep ? Math.abs(deltaP) * 20 : 5;
    const rawRHWeight = isHumStep ? Math.abs(deltaRH) * 4 : 5;

    const weights = computeXAIWeights(rawTWeight, rawPWeight, rawRHWeight);

    return {
      isValid: false,
      tierPassed: 3,
      severity: 'RED_HARDWARE_FAULT',
      classification: 'SENSOR_SPIKE',
      wmoFlag: 'FLAG_4_CORRUPT_HARDWARE',
      alertBadge: {
        label: 'SENSOR HARDWARE FAULT',
        color: 'rose',
        description: 'Isolated physical step-jump without thermodynamic coupling across associated channels.',
      },
      raw: { temperature: T, pressure: P, humidity: RH },
      imputed: {
        temperature: isTempSpike ? imputedT : T,
        pressure: isPressStep ? imputedP : P,
        humidity: isHumStep ? imputedRH : RH,
        wasImputed: true,
      },
      deltas: { deltaT, deltaP, deltaRH },
      xai: {
        ...weights,
        diagnosticExplanation: `Hardware Open-Circuit Spike: An isolated, massive jump occurred on the ${isTempSpike ? 'Temperature' : ''}${isPressStep ? 'Pressure' : ''}${isHumStep ? 'Humidity' : ''} channel. Quarantined and activated moving-average imputation.`,
      },
      recommendedAction: 'Isolate sensor channel from NWP assimilation pipeline. Auto-impute with synthetic moving average.',
    };
  }

  // -------------------------------------------------------------
  // NOMINAL PASS: All 3 Tiers Passed
  // -------------------------------------------------------------
  return {
    isValid: true,
    tierPassed: 3,
    severity: 'NOMINAL',
    classification: 'NOMINAL_OPERATION',
    wmoFlag: 'FLAG_1_GOOD',
    alertBadge: {
      label: 'NOMINAL (VERIFIED)',
      color: 'emerald',
      description: 'All 3 QC tiers passed. Data validated against WMO-No. 8 physical and thermodynamic envelopes.',
    },
    raw: { temperature: T, pressure: P, humidity: RH },
    imputed: {
      temperature: T,
      pressure: P,
      humidity: RH,
      wasImputed: false,
    },
    deltas: { deltaT, deltaP, deltaRH },
    xai: {
      tempWeight: 33,
      pressWeight: 34,
      humWeight: 33,
      primaryParameter: 'none',
      diagnosticExplanation: 'Signals nominal. Multi-sensor cross-correlation within standard climatological limits.',
    },
    recommendedAction: 'Continuous ingestion into National Numerical Weather Prediction (NWP) model assimilation.',
  };
}

/**
 * Normalizes parameter weights to sum precisely to 100%
 */
function computeXAIWeights(tVal: number, pVal: number, rhVal: number): {
  tempWeight: number;
  pressWeight: number;
  humWeight: number;
  primaryParameter: 'temperature' | 'pressure' | 'humidity' | 'none';
} {
  const sum = Math.max(0.1, tVal + pVal + rhVal);
  const tempWeight = Math.min(100, Math.max(0, Math.round((tVal / sum) * 100)));
  const pressWeight = Math.min(100 - tempWeight, Math.max(0, Math.round((pVal / sum) * 100)));
  const humWeight = Math.max(0, 100 - tempWeight - pressWeight);

  let primary: 'temperature' | 'pressure' | 'humidity' | 'none' = 'none';
  if (tempWeight >= pressWeight && tempWeight >= humWeight) primary = 'temperature';
  else if (pressWeight >= tempWeight && pressWeight >= humWeight) primary = 'pressure';
  else primary = 'humidity';

  return {
    tempWeight,
    pressWeight,
    humWeight,
    primaryParameter: primary,
  };
}
