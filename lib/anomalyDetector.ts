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

export type AnomalySeverity = 'NOMINAL' | 'BLUE_GENUINE_WEATHER' | 'AMBER_PROBE_FREEZE' | 'RED_HARDWARE_FAULT';

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
  PRESS_MIN: 920.0, // hPa
  PRESS_MAX: 1050.0, // hPa
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
};

/**
 * Calculates standard deviation for an array of numbers
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 1.0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculates moving average of past uncorrupted historical values
 */
function calculateGaussianWMA(history: number[], fallback: number): number {
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

  const imputedT = calculateGaussianWMA(validTempHistory, T);
  const imputedP = calculateGaussianWMA(validPressHistory, P);
  const imputedRH = calculateGaussianWMA(validHumHistory, RH);

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

    const tStd = calculateStdDev(tSeries);
    const pStd = calculateStdDev(pSeries);
    const rhStd = calculateStdDev(rhSeries);

    const isTFrozen = tStd < ROC_LIMITS.FREEZE_VARIANCE_THRESHOLD;
    const isPFrozen = pStd < ROC_LIMITS.FREEZE_VARIANCE_THRESHOLD;
    const isRHFrozen = rhStd < ROC_LIMITS.FREEZE_VARIANCE_THRESHOLD;

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
