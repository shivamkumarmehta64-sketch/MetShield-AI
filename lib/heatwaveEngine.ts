/**
 * heatwaveEngine.ts
 * IMD DSS HEATWAVE & CLIMATOLOGICAL DEPARTURE ENGINE
 *
 * Modeled directly on IMD's official Decision Support System (DSS):
 * https://dss.imd.gov.in/dwr_img/GIS/heatwave.html
 *
 * Implements official India Meteorological Department (IMD) criteria:
 * - Terrain-specific baseline thresholds (Plains ≥ 40°C, Coastal ≥ 37°C, Hills ≥ 30°C)
 * - Departure from normal temperature (Normal, Heat Wave, Severe Heat Wave)
 * - 4-Stage Color Coded Warning (Green, Yellow, Orange, Red)
 * - Heat Index / Humidex (Thermal Discomfort Index)
 * - Warm Night criteria
 * - 5-Day forecast outlook projection
 */

import { IndiaDistrict } from './india766Districts';
import { LiveDistrictReading, HistoricalReading } from './sensorFaultEngine';
import { getDistrictElevation } from './districtElevation';

export type IMDHeatwaveWarning = 'NO_WARNING' | 'WATCH' | 'ALERT' | 'WARNING_SEVERE';

export interface HeatwaveReport {
  districtId: string;
  districtName: string;
  state: string;
  terrainType: 'Plains' | 'Coastal' | 'Hilly';
  maxTemp: number;
  climatologicalNormal: number;
  /**
   * True when the district has a registered elevation and the climatological
   * normal was computed with a real terrain adjustment. When false, the normal
   * fell back to a coarse latitude/sea-level approximation and `departure`
   * should be treated as provisional.
   */
  elevationKnown: boolean;
  /** Elevation used, or null when unknown. */
  elevationM: number | null;
  departure: number;
  heatwaveStatus: 'NORMAL' | 'HEAT_WAVE' | 'SEVERE_HEAT_WAVE';
  warningLevel: IMDHeatwaveWarning;
  warningColor: string; // #22c55e (Green), #eab308 (Yellow), #f97316 (Orange), #ef4444 (Red)
  warningLabelEn: string;
  warningLabelHi: string;
  humidex: number; // Feels-like thermal comfort
  heatStressCategory: 'Comfortable' | 'Caution' | 'Extreme Caution' | 'Danger' | 'Extreme Danger';
  isWarmNight: boolean;
  minTempDeparture: number;
  dayForecast: Array<{
    day: number; // 1 to 5
    dateStr: string;
    forecastMaxTemp: number;
    forecastDeparture: number;
    warningLevel: IMDHeatwaveWarning;
    warningColor: string;
  }>;
  /**
   * Per-day maximum temperature actually OBSERVED in the fetched hourly window.
   * Not a forecast. Present so the panel can show real recent behaviour in
   * place of a fabricated outlook.
   */
  recentObservedMaxima: Array<{ date: string; maxTemp: number }>;
  healthAdvisory: string[];
}

/**
 * Approximate climatological normal maximum temperature for Indian districts in summer
 * based on latitude, altitude, and climatic zone.
 */
export function getClimatologicalNormalMaxTemp(lat: number, lng: number, elevM = 200, isCoastal = false): number {
  if (elevM >= 1200) {
    // High altitude (Leh, Shimla, Ooty, etc.)
    return 24.5;
  }
  if (elevM >= 700) {
    // Subtropical plateau (Bengaluru, Shillong, Pune)
    return 32.0;
  }
  if (isCoastal) {
    // Coastal marine (Mumbai, Chennai, Kochi, Visakhapatnam)
    return 34.5;
  }
  if (lng < 75.0 && lat > 24.0) {
    // Thar desert / Western Rajasthan (Jaisalmer, Bikaner, Barmer)
    return 41.5;
  }
  if (lat > 22.0 && lat < 28.0 && lng > 76.0 && lng < 86.0) {
    // Indo-Gangetic Plains & Central India (Delhi, UP, MP, Bihar)
    return 39.5;
  }
  // Deccan Interior / Southern Plains
  return 37.0;
}

/**
 * Calculate Canadian Humidex / Heat Index for human thermal stress
 * T = ambient temp in °C, RH = relative humidity %
 */
export function calculateHumidex(tempC: number, rh: number): number {
  // Vapor pressure e (hPa)
  const e = (rh / 100) * 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
  // Humidex = T + 5/9 * (e - 10)
  const humidex = tempC + (5 / 9) * (e - 10);
  return Math.round(humidex * 10) / 10;
}

/**
 * Classify thermal stress based on Humidex
 */
export function getHumidexStress(humidex: number): 'Comfortable' | 'Caution' | 'Extreme Caution' | 'Danger' | 'Extreme Danger' {
  if (humidex < 30) return 'Comfortable';
  if (humidex < 39) return 'Caution';
  if (humidex < 46) return 'Extreme Caution';
  if (humidex < 54) return 'Danger';
  return 'Extreme Danger';
}

/**
 * Master IMD Heatwave Evaluator
 * Follows IMD Criteria:
 * 1. Qualifying threshold:
 *    - Plains: Max Temp >= 40°C
 *    - Coastal: Max Temp >= 37°C
 *    - Hilly: Max Temp >= 30°C
 * 2. Heat Wave:
 *    - Based on Departure: Departure from normal is 4.5°C to 6.4°C
 *    - Based on Actual: Actual max temp >= 45°C (in plains)
 * 3. Severe Heat Wave:
 *    - Based on Departure: Departure from normal is > 6.4°C
 *    - Based on Actual: Actual max temp >= 47°C (in plains)
 */
export function evaluateIMDHeatwave(
  district: IndiaDistrict,
  currentReading: LiveDistrictReading | null,
  history: HistoricalReading[] = []
): HeatwaveReport {
  /**
   * Terrain resolution.
   *
   * PREVIOUSLY: `const elev = 200;` — every district in India was evaluated as
   * if it sat 200 m above sea level. Leh (3,524 m) and Shimla (2,205 m) were
   * therefore given plains/coastal climatological normals of 34.5-41.5 °C, and
   * a district with a 40 °C summer day could be classified against a normal
   * that has no relationship to its climate. The `isHilly` state-name substring
   * test partly masked this for four states and failed for the rest.
   *
   * NOW: use the registry's elevation when present. When it is absent, say so
   * rather than substituting a constant — `elevationKnown` is surfaced on the
   * report so the UI can mark the departure as provisional.
   */
  const knownElev = getDistrictElevation(district);
  const elevationKnown = knownElev !== null;
  // Substring test retained only as a fallback signal when no elevation is
  // registered, never as an override for a known elevation.
  const stateSuggestsHills =
    district.state.includes('Ladakh') ||
    district.state.includes('Himachal') ||
    district.state.includes('Uttarakhand') ||
    district.state.includes('Sikkim') ||
    district.state.includes('Jammu');
  const isHilly = elevationKnown
    ? knownElev >= 700
    : stateSuggestsHills;
  const isCoastal = district.isCoastal ?? false;

  const terrainType = isHilly ? 'Hilly' : isCoastal ? 'Coastal' : 'Plains';
  const normalMax = getClimatologicalNormalMaxTemp(
    district.lat,
    district.lng,
    knownElev ?? (stateSuggestsHills ? 1500 : undefined),
    isCoastal
  );

  // Use observed temperature or fallback to estimated summer day peak
  const observedTemp = currentReading?.temperature_2m ?? normalMax;
  // Estimate daytime maximum (usually ~2-3°C above current if morning/evening)
  const maxTemp = currentReading?.apparent_temperature != null
    ? Math.max(observedTemp, currentReading.apparent_temperature * 0.95)
    : observedTemp;

  const departure = Math.round((maxTemp - normalMax) * 10) / 10;

  // Qualifying threshold
  const thresholdMet =
    (terrainType === 'Plains' && maxTemp >= 40.0) ||
    (terrainType === 'Coastal' && maxTemp >= 37.0) ||
    (terrainType === 'Hilly' && maxTemp >= 30.0);

  let heatwaveStatus: 'NORMAL' | 'HEAT_WAVE' | 'SEVERE_HEAT_WAVE' = 'NORMAL';
  let warningLevel: IMDHeatwaveWarning = 'NO_WARNING';
  let warningColor = '#22c55e'; // Green
  let warningLabelEn = 'Green — Normal (No Action Required)';
  let warningLabelHi = 'हरा — सामान्य (कोई चेतावनी नहीं)';

  if (thresholdMet) {
    if (departure > 6.4 || maxTemp >= 47.0) {
      heatwaveStatus = 'SEVERE_HEAT_WAVE';
      warningLevel = 'WARNING_SEVERE';
      warningColor = '#ef4444'; // Red
      warningLabelEn = 'Red Alert — Severe Heat Wave (Take Action)';
      warningLabelHi = 'लाल चेतावनी — अत्यधिक तीव्र लू (तुरंत सुरक्षा उपाय करें)';
    } else if (departure >= 4.5 || maxTemp >= 45.0) {
      heatwaveStatus = 'HEAT_WAVE';
      warningLevel = 'ALERT';
      warningColor = '#f97316'; // Orange
      warningLabelEn = 'Orange Alert — Heat Wave (Be Prepared)';
      warningLabelHi = 'नारंगी चेतावनी — लू (तैयार रहें)';
    } else if (departure >= 2.5 || maxTemp >= 42.0) {
      heatwaveStatus = 'HEAT_WAVE';
      warningLevel = 'WATCH';
      warningColor = '#eab308'; // Yellow
      warningLabelEn = 'Yellow Watch — Hot Day (Be Updated)';
      warningLabelHi = 'पीली सतर्कता — गर्म दिन (अपडेट रहें)';
    }
  }

  // Humidex thermal stress
  const rh = currentReading?.relative_humidity_2m ?? 45;
  const humidex = calculateHumidex(maxTemp, rh);
  const heatStressCategory = getHumidexStress(humidex);

  // Warm night evaluation
  const minTemp = history.length > 0
    ? Math.min(...history.map(h => h.temperature ?? 30))
    : maxTemp - 10;
  const isWarmNight = minTemp >= 28.0 && maxTemp >= 40.0;
  const minTempDeparture = Math.round((minTemp - 24.0) * 10) / 10;

  /**
   * 5-day outlook.
   *
   * PREVIOUSLY: each day was `Math.sin(d * 0.8) * 1.5` added to the current
   * temperature, producing plausible-looking `forecastMaxTemp`,
   * `forecastDeparture` and IMD colour-coded `warningLevel` values for five
   * days in the future. That is not a forecast and is not derived from any
   * numerical model — it is a sine wave, rendered in IMD's official warning
   * colours, on a panel titled "forecast". A heatwave warning is exactly the
   * kind of output an operator would act on.
   *
   * NOW: the array is empty, because this build has no forecast model. Showing
   * nothing is correct; showing a fabricated heatwave risk is not.
   *
   * `history` (Open-Meteo hourly, up to 48h) is a genuine forecast source and
   * is the right thing to plumb in when wired up.
   */
  const dayForecast: HeatwaveReport['dayForecast'] = [];

  // Observational context we DO have: the most recent hourly maxima from the
  // fetched history window. Not a forecast — clearly separated and labelled.
  const recentObservedMaxima = (() => {
    if (history.length === 0) return [];
    const byDay = new Map<string, number>();
    for (const h of history) {
      const t = h.temperature;
      if (t == null || !Number.isFinite(t)) continue;
      const key = String(h.timestamp).slice(0, 10);
      const prev = byDay.get(key);
      if (prev === undefined || t > prev) byDay.set(key, t);
    }
    return [...byDay.entries()].map(([date, t]) => ({
      date,
      maxTemp: Math.round(t * 10) / 10,
    }));
  })();

  // Actionable NDMA & MoES Health Advisories
  const healthAdvisory: string[] = [];
  if (warningLevel === 'WARNING_SEVERE') {
    healthAdvisory.push('CRITICAL: Very high likelihood of developing heat stroke in all ages; avoid outdoor exposure between 11:00 AM and 4:00 PM.');
    healthAdvisory.push('Districts: Implement Heat Action Plan (HAP) Level-3 — cool roof activation and emergency water distribution stations.');
    healthAdvisory.push('Hospitals: Keep cooling fluids, ice packs, and heat stroke dedicated ICU beds ready.');
  } else if (warningLevel === 'ALERT') {
    healthAdvisory.push('High temperature; increased likelihood of heat illness in infants, elderly, and chronic disease patients.');
    healthAdvisory.push('Outdoor workers: Take mandatory shaded rest breaks; drink ORS, lemon water, and buttermilk frequently.');
  } else if (warningLevel === 'WATCH') {
    healthAdvisory.push('Moderate heat; tolerable for general public but moderate health concern for vulnerable persons.');
    healthAdvisory.push('Wear lightweight, light-colored loose cotton clothes; cover head with umbrella or cloth.');
  } else {
    healthAdvisory.push('Temperatures within normal climatological bounds. Standard hydration recommended.');
  }

  return {
    districtId: district.id,
    districtName: district.name,
    state: district.state,
    terrainType,
    maxTemp,
    climatologicalNormal: normalMax,
    elevationKnown,
    elevationM: knownElev,
    departure,
    heatwaveStatus,
    warningLevel,
    warningColor,
    warningLabelEn,
    warningLabelHi,
    humidex,
    heatStressCategory,
    isWarmNight,
    minTempDeparture,
    dayForecast,
    recentObservedMaxima,
    healthAdvisory
  };
}
