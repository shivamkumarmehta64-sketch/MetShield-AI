/**
 * spatialCrossCheck.ts
 * METSHIELD AI — INDEPENDENT ATMOSPHERIC CORROBORATION
 *
 * A station's own history can tell you that a reading is inconsistent with
 * itself. It cannot tell you whether the *atmosphere* agrees, because a genuine
 * squall and a barometer that lost its zero-point both look like "a pressure
 * number that is too low". Only an outside source can separate those.
 *
 * This module cross-checks a station against live Open-Meteo conditions at the
 * district the station sits in, and returns one of five verdicts.
 *
 * ── Why this does NOT call fetchDistrictFromOpenMeteo ──────────────────────
 * The plan called for reusing it. On reading the source, that would have been
 * wrong. Its catch block (districtEngine.ts:305) falls back to
 * `generatePhysicalDistrictTelemetry` — the synthetic generator — and then
 * still stamps the result `status: 'live'` (line 327). A network failure
 * therefore does not surface as an error: it returns confident, invented
 * weather wearing a live badge, and nothing downstream can tell the difference
 * by checking status.
 *
 * That generator is not a plausible stand-in anyway. Its wind direction is
 * `(d.name.charCodeAt(0) * 45) % 360`, so "Purnia (Purnea)" ('P' = 80) gives
 * 3600 % 360 = 0° — a permanent north wind for every district whose name
 * starts with 'P'. Cross-checking a real station against invented data is
 * worse than not cross-checking at all, because it produces a *confident wrong
 * answer*, and the one thing a QC system's independent tiebreak must never do
 * is invent its own agreement.
 *
 * So this module fetches Open-Meteo itself and has no fallback at all. No
 * network means no verdict — and it says so in the returned rationale.
 *
 * ── Both sides are mean sea level already ────────────────────────────────
 * The station registry's `baseline.pressureMean` is an MSL climatological
 * value, not a surface reading — AWS-SML-14 lists 1014.2 hPa at 2205 m
 * elevation, and a surface pressure there would be about 770 hPa. So no
 * orographic reduction is applied on either side, and doing one would be
 * actively wrong: an early version of this file reduced the station value with
 * `calculateQnhPressure` and produced a +67.8 hPa residual at Pune, which is
 * larger than the entire plausible range of atmospheric pressure.
 *
 * This also settles the elevation question the plan raised. `IndiaDistrict`
 * has no elevation field, and both district-side consumers hardcode one for the
 * whole country — `heatwaveEngine.ts:121` uses `const elev = 200`, and
 * `generatePhysicalDistrictTelemetry:171` uses `d.lat > 31 && d.lng < 78 ? 1600 : 150`.
 * Neither is used here, so the missing field costs nothing. Had the comparison
 * needed surface pressure, that ~1.2 hPa of injected error would have been the
 * same order as the ΔP ≤ -2.5 hPa storm threshold, and would have been
 * reclassified as weather.
 */

import { haversineKm } from './geo';
import { getStationProfile, IMDStationProfile } from './stationData';
import { ALL_766_DISTRICTS, IndiaDistrict } from './india766Districts';
import {
  nicWmoEngineInstance,
  type TelemetryPacket,
} from './anomalyLogic';

export type CrossCheckVerdict =
  /** Station and the surrounding atmosphere agree. Data is good. */
  | 'ATMOSPHERE_CONFIRMS'
  /** Station is anomalous but the district is quiet → probable hardware fault. */
  | 'STATION_DIVERGES'
  /** Station is anomalous and the district shows the same coupled signature → real weather. */
  | 'INDEPENDENT_STORM_CORROBORATION'
  /** Sources disagree but the station itself reports nominal. Not a fault yet. */
  | 'REGIONAL_EXTREME_UNCOUPLED'
  /** No usable external observation. Absence of evidence, not evidence of absence. */
  | 'INSUFFICIENT_DATA';

type Band = 'AGREE' | 'DIVERGE' | 'NO_DATA';

export interface CrossCheckResult {
  stationId: string;
  verdict: CrossCheckVerdict;
  /** Human-readable justification, safe to render verbatim in the UI. */
  rationale: string;
  station: { temperature: number | null; pressureMsl: number | null; humidity: number | null };
  district: { name: string; state: string; distanceKm: number; temperature: number | null; pressureMsl: number | null; humidity: number | null };
  /** Station minus external, per channel. */
  deltas: { temperature: number | null; pressure: number | null; humidity: number | null };
  /** Which tolerance band each channel fell into, for the explainability panel. */
  bands: { temperature: Band; pressure: Band; humidity: Band };
  source: 'OPEN_METEO' | 'NONE';
  observedAt: number;
}

/**
 * Agreement tolerances, on the raw 2-metre values because that is what an AWS
 * measures. They widen with distance, because a district centroid is not the
 * station: separating the two by 31 km puts real synoptic gradient between
 * them.
 *
 * The pressure floor is the widest, at 5 hPa, and for a specific reason.
 * `baseline.pressureMean` in the station registry is a *climatological* MSL
 * value, not a reading from this morning. A station can therefore sit 5 hPa
 * above its own normal simply because the whole region is under a different
 * air mass today, with nothing wrong with the instrument. A 2 hPa floor — the
 * obvious choice, and the one this file started with — reports that as a fault.
 *
 * Consequently a single-sample pressure divergence can corroborate a storm but
 * can never establish a fault on its own. `STATION_DIVERGES` is gated on a
 * non-pressure channel below, for that reason.
 */
const TOL_BASE = { temperatureC: 1.2, pressureHpa: 1.0, humidityPct: 4 };
const TOL_PER_100KM = { temperatureC: 1.8, pressureHpa: 1.5, humidityPct: 4 };
const TOL_FLOOR = { temperatureC: 3.0, pressureHpa: 5.0, humidityPct: 8 };

/** Widening tolerance bands for a given station-to-centroid separation. */
function toleranceFor(distanceKm: number) {
  const f = Math.max(0, distanceKm) / 100;
  return {
    temperatureC: Math.max(TOL_FLOOR.temperatureC, TOL_BASE.temperatureC + TOL_PER_100KM.temperatureC * f),
    pressureHpa: Math.max(TOL_FLOOR.pressureHpa, TOL_BASE.pressureHpa + TOL_PER_100KM.pressureHpa * f),
    humidityPct: Math.max(TOL_FLOOR.humidityPct, TOL_BASE.humidityPct + TOL_PER_100KM.humidityPct * f),
  };
}

/**
 * How far a station may sit from its district centroid and still be considered
 * represented by that district's weather. Bihar is roughly 150 km across, so
 * 60 km stops a station being judged against weather from the far side of the
 * state.
 */
const MAX_DISTRICT_DISTANCE_KM = 60;

/** Exported for the verifier and any UI that explains the radius to an operator. */
export const MAX_DISTRICT_RADIUS_KM = MAX_DISTRICT_DISTANCE_KM;

/** Open-Meteo has no SLA; bound the wait so a stalled call cannot hang the UI. */
const REQUEST_TIMEOUT_MS = 8000;

/** Nearest district centroid to the station, with the separating distance. */
export function nearestDistrict(station: IMDStationProfile): { district: IndiaDistrict; distanceKm: number } {
  let best: IndiaDistrict = ALL_766_DISTRICTS[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const d of ALL_766_DISTRICTS) {
    const km = haversineKm(station.latitude, station.longitude, d.lat, d.lng);
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return { district: best, distanceKm: bestKm };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function signed(v: number): string {
  return (v >= 0 ? '+' : '') + (Math.round(v * 10) / 10).toFixed(1);
}

/**
 * Independent fetch of the district's current conditions. Throws on any failure
 * — this module has no fallback path by design.
 */
async function fetchDistrictWeather(
  d: IndiaDistrict
): Promise<{ temperature: number | null; pressure: number | null; humidity: number | null }> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${d.lat.toFixed(4)}&longitude=${d.lng.toFixed(4)}` +
    `&current=temperature_2m,relative_humidity_2m,pressure_msl` +
    `&timezone=Asia%2FKolkata`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!resp.ok) throw new Error(`Open-Meteo HTTP ${resp.status}`);
    const curr = (await resp.json())?.current ?? {};
    return {
      temperature: num(curr.temperature_2m),
      pressure: num(curr.pressure_msl),
      humidity: num(curr.relative_humidity_2m),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether the independent source itself shows a convective regime, judged on
 * the same physics the station-side engine uses: depressed pressure, saturated
 * air, and cool enough for evaporative cooling to be plausible.
 *
 * Open-Meteo's `current` block is a single instantaneous sample, so no per-tick
 * delta exists here — this is an absolute-signature test, not the Δ test the
 * station side runs. The thresholds are deliberately loose. Missing a real
 * storm means suppressing a warning, which is the worse error here, so the
 * test is biased toward firing.
 */
function externalShowsCoupledEvent(d: { pressure: number; humidity: number; temperature: number }): boolean {
  return d.pressure <= 1008 && d.humidity >= 90 && d.temperature <= 30;
}

/** The engine's most recent packet for a station, if it has one. */
function enginePacket(stationId: string): TelemetryPacket | null {
  const buf = nicWmoEngineInstance.getBuffer(stationId);
  return buf.length > 0 ? buf[buf.length - 1] : null;
}

/**
 * Cross-check one station's latest packet against live district weather.
 *
 * `stationOverride` lets a caller pass the packet it already holds rather than
 * re-reading the engine buffer, so the verdict always describes the reading the
 * operator is actually looking at. When omitted, the engine's own buffer is used.
 */
export async function crossCheckStation(
  stationId: string,
  stationOverride?: TelemetryPacket
): Promise<CrossCheckResult> {
  const station = getStationProfile(stationId);
  const { district, distanceKm } = nearestDistrict(station);
  const observedAt = Date.now();

  const emptyResult = (source: 'OPEN_METEO' | 'NONE'): CrossCheckResult => ({
    stationId,
    verdict: 'INSUFFICIENT_DATA',
    rationale: '',
    station: { temperature: null, pressureMsl: null, humidity: null },
    district: {
      name: district.name,
      state: district.state,
      distanceKm: Math.round(distanceKm),
      temperature: null,
      pressureMsl: null,
      humidity: null,
    },
    deltas: { temperature: null, pressure: null, humidity: null },
    bands: { temperature: 'NO_DATA', pressure: 'NO_DATA', humidity: 'NO_DATA' },
    source,
    observedAt,
  });

  if (distanceKm > MAX_DISTRICT_DISTANCE_KM) {
    return {
      ...emptyResult('NONE'),
      rationale: `Nearest district centroid (${district.name}) is ${Math.round(distanceKm)} km away — beyond the ${MAX_DISTRICT_DISTANCE_KM} km corroboration radius, so that district is not a fair proxy for this station.`,
    };
  }

  let ext: { temperature: number | null; pressure: number | null; humidity: number | null };
  try {
    ext = await fetchDistrictWeather(district);
  } catch {
    // Deliberately does not fall back to a modelled value. See the file header.
    return {
      ...emptyResult('NONE'),
      rationale: `Live observation for ${district.name} could not be obtained (network or provider error). No independent opinion exists, so the station verdict stands on its own evidence.`,
    };
  }

  const { temperature: eT, pressure: eP, humidity: eH } = ext;

  const pkt = stationOverride ?? enginePacket(stationId);
  const sT = num(pkt?.raw.temperature);
  const sP = num(pkt?.raw.pressure);
  const sH = num(pkt?.raw.humidity);

  if (sT === null || sP === null || sH === null) {
    return {
      ...emptyResult('OPEN_METEO'),
      rationale: `No station reading available to compare against ${district.name} yet.`,
    };
  }
  if (eT === null || eP === null || eH === null) {
    return {
      ...emptyResult('OPEN_METEO'),
      rationale: `Live ${district.name} observation is missing one or more channels, so the comparison cannot be scored on all three.`,
    };
  }

  // `sP` is already MSL — see the file header. No orographic reduction here.
  const sMslP = sP;

  const dT = sT - eT;
  const dP = sMslP - eP;
  const dH = sH - eH;

  const tol = toleranceFor(distanceKm);
  const bands: CrossCheckResult['bands'] = {
    temperature: Math.abs(dT) <= tol.temperatureC ? 'AGREE' : 'DIVERGE',
    pressure: Math.abs(dP) <= tol.pressureHpa ? 'AGREE' : 'DIVERGE',
    humidity: Math.abs(dH) <= tol.humidityPct ? 'AGREE' : 'DIVERGE',
  };

  const result: CrossCheckResult = {
    stationId,
    verdict: 'INSUFFICIENT_DATA',
    rationale: '',
    station: { temperature: sT, pressureMsl: sMslP, humidity: sH },
    district: {
      name: district.name,
      state: district.state,
      distanceKm: Math.round(distanceKm),
      temperature: eT,
      pressureMsl: eP,
      humidity: eH,
    },
    deltas: {
      temperature: Math.round(dT * 10) / 10,
      pressure: Math.round(dP * 10) / 10,
      humidity: Math.round(dH * 10) / 10,
    },
    bands,
    source: 'OPEN_METEO',
    observedAt,
  };

  const deltaText = `ΔT ${signed(dT)} °C, ΔP ${signed(dP)} hPa, ΔRH ${signed(dH)} %`;
  const agrees =
    bands.temperature === 'AGREE' && bands.pressure === 'AGREE' && bands.humidity === 'AGREE';

  if (agrees) {
    return {
      ...result,
      verdict: 'ATMOSPHERE_CONFIRMS',
      rationale: `All three channels agree with live ${district.name} conditions (${deltaText}). The independent source corroborates the station.`,
    };
  }

  // The engine's own label is deliberately not consulted below. The whole point
  // of an independent check is that it can reach a different conclusion from the
  // thing it is checking — and gating on `classification !== 'NOMINAL_OPERATION'`
  // would make this module agree with the engine by construction and detect
  // nothing. It arbitrates on the three band results alone.
  const coupled = externalShowsCoupledEvent({ pressure: eP, humidity: eH, temperature: eT });

  if (bands.temperature === 'DIVERGE' || bands.humidity === 'DIVERGE') {
    const diverging = Object.entries(bands)
      .filter(([, b]) => b === 'DIVERGE')
      .map(([k]) => k);
    return {
      ...result,
      verdict: 'STATION_DIVERGES',
      rationale: `The station disagrees with live ${district.name} on ${diverging.join(', ')} (${deltaText}) while the surrounding atmosphere is quiet. Temperature and humidity are instantaneous functions of the air at the station, so a disagreement there is a real disagreement — the signature of a local sensor fault.`,
    };
  }

  // Pressure alone is never decisive — see the note on TOL_FLOOR. If the region
  // is also in a convective regime, that is an explanation; if it is not, the
  // only honest statement is that there is nothing to act on yet.
  if (bands.pressure === 'DIVERGE' && coupled) {
    return {
      ...result,
      verdict: 'INDEPENDENT_STORM_CORROBORATION',
      rationale: `Live ${district.name} shows the same coupled convective signature (${eP} hPa MSL, ${eH} % RH, ${eT} °C), which accounts for the pressure difference (${deltaText}). The surrounding atmosphere is in a storm regime — do not quarantine the station on this evidence.`,
    };
  }

  return {
    ...result,
    verdict: 'REGIONAL_EXTREME_UNCOUPLED',
    rationale: `Only the pressure channel disagrees with live ${district.name} (${deltaText}), which is expected when the region sits under a different air mass from its climatological normal. Temperature and humidity agree, so there is no independent evidence of a fault.`,
  };
}
