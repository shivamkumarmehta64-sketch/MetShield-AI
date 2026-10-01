/**
 * Barometric reference datum — the single place that says which pressure a
 * number is measured against.
 * ----------------------------------------------------------------------
 * Open-Meteo returns `surface_pressure`: station pressure, QFE. Every baseline
 * in `lib/stationData.ts` and every ΔP in `lib/anomalyLogic.ts` is mean
 * sea level, QNH. Comparing the two directly puts an elevated station ~1 hPa
 * per 27 m off its baseline — a step the QC engine correctly reads as a
 * hardware fault. That is the bug `__tests__/pressureLevelConsistency.test.ts`
 * was written for.
 *
 * It matters twice over for the external reference layer, which is *not* part
 * of the QC engine and must not be able to corrupt a decision. There, an
 * unreduced pressure is not a fault — it is simply not comparable, and the UI
 * has to say so rather than print a 224 hPa "disagreement".
 *
 * Three copies of this function already exist: `calculateQnhPressure()` in
 * `lib/anomalyLogic.ts` (the engine), and local copies in
 * `app/api/weather/route.ts` and `lib/liveWeatherService.ts` (the two
 * ingestion boundaries). They are left alone deliberately — the engine copy is
 * load-bearing and refactoring it is a domain change, not a cleanup. This
 * module is the canonical fourth; `__tests__/pressureReduction.test.ts` pins it
 * to the engine's values so the copies cannot drift apart silently.
 */
export const LAPSE_RATE = 0.0065; // K/m, standard tropospheric lapse rate

/**
 * WMO/ICAO standard atmosphere reduction: station pressure (QFE) -> MSL (QNH).
 *
 * Returns the input unchanged when there is no elevation to correct for, or
 * when the inputs are not physically usable. Callers must not treat an
 * unchanged return as "reduced to sea level".
 */
export function reduceToMeanSeaLevel(
  stationPressureHpa: number,
  elevationM: number,
  tempC: number
): number {
  if (!Number.isFinite(stationPressureHpa) || !Number.isFinite(tempC) || elevationM <= 0) {
    return stationPressureHpa;
  }
  const factor = 1 - (LAPSE_RATE * elevationM) / (tempC + LAPSE_RATE * elevationM + 273.15);
  if (factor <= 0) return stationPressureHpa;
  return Math.round(stationPressureHpa * Math.pow(factor, -5.257) * 10) / 10;
}

/** The pressure datum a value is expressed against. Drives the UI's wording. */
export type PressureDatum = 'MEAN_SEA_LEVEL' | 'STATION_SURFACE' | 'UNKNOWN';

export const PRESSURE_DATUM_LABEL: Record<PressureDatum, string> = {
  MEAN_SEA_LEVEL: 'SEA-LEVEL (QNH)',
  STATION_SURFACE: 'STATION SURFACE (QFE)',
  UNKNOWN: 'DATUM UNKNOWN',
};

/**
 * Classifies a pressure value for display. Only MSL is comparable against a
 * MetShield baseline; QFE is not, and UNKNOWN means the reduction was skipped
 * (no elevation registered) so the number is shown but never differenced.
 */
export function classifyPressureDatum(
  reducedToMsl: boolean,
  providerReported: 'surface_pressure' | 'pressure_msl' | null
): PressureDatum {
  if (providerReported === 'pressure_msl') return 'MEAN_SEA_LEVEL';
  if (providerReported !== 'surface_pressure') return 'UNKNOWN';
  return reducedToMsl ? 'MEAN_SEA_LEVEL' : 'STATION_SURFACE';
}
