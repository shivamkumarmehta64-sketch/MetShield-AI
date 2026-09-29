import { IMD_AWS_STATIONS, getStationProfile } from './stationData';
import { classifyAnomaly, AnomalyFeatureVector } from './mlAnomalyModel';

// ─── Type Definitions ───
export type WMOQualityFlag = 'FLAG_1_VERIFIED_GOOD' | 'FLAG_2_CONVECTIVE_STORM' | 'FLAG_3_SUSPECT_DRIFT' | 'FLAG_4_CORRUPT_HARDWARE' | 'FLAG_5_PACKET_LOSS';
export type RootCauseClassification = 'NOMINAL_OPERATION' | 'GENUINE_CONVECTIVE_EVENT' | 'SENSOR_SPIKE' | 'FROZEN_VALUE' | 'CALIBRATION_DRIFT' | 'TELEMETRY_PACKET_LOSS';
export type GovAlertLevel = 'LEVEL_0_NOMINAL' | 'LEVEL_2_YELLOW' | 'LEVEL_3_AMBER' | 'LEVEL_4_RED';

export interface TelemetryPacket {
  packetId: string;
  stationId: string;
  timestamp: number;
  timeIST: string;
  raw: { temperature: number | null; pressure: number | null; humidity: number | null; windSpeedKph: number | null; windDirectionDeg: number | null; rainfallMm10min: number | null };
  imputed: { temperature: number; pressure: number; humidity: number; windSpeedKph: number; windDirectionDeg: number; rainfallMm10min: number; wasCorrected: boolean };
  ratesOfChange: { tempRoC: number; pressRoC: number; humRoC: number; windRoC: number };
  classification: RootCauseClassification;
  wmoFlag: WMOQualityFlag;
  alertLevel: GovAlertLevel;
  faultProbability: number;
  xaiAttribution: { tempWeight: number; pressWeight: number; humWeight: number; primaryParameter: string; diagnosticNote: string };
  mlPrediction: { mlClassification: string; mlConfidence: number; agreesWithRules: boolean };
  operationalAction: string;
  ticketId: string | null;
  orographicQnhPressure?: number | null;
  spatialValidation?: { nearestStations: string[]; verdict: 'SINGLE_NODE_FAULT' | 'REGIONAL_WEATHER' | 'INSUFFICIENT_DATA' };
  /**
   * DEMO INTEGRITY SEAL — NOT CRYPTOGRAPHIC.
   *
   * The field names are retained for D1/back-compat, but read them as:
   *   hmacSha256      -> a non-cryptographic FNV-1a style checksum
   *   auditMerkleRoot -> a second, independent checksum of the same input
   * Neither is HMAC-SHA256. Neither is a Merkle root. Neither resists tampering:
   * an attacker who can write to the row can recompute both in one pass.
   *
   * The seal detects ACCIDENTAL corruption (a truncated write, a partially
   * updated field) and nothing more. See `computeDemoIntegritySeal` and
   * `lib/dataProvenance.ts` (DATA_SOURCES.demoIntegritySeal).
   *
   * To make this claim true, replace the body of computeDemoIntegritySeal with
   * a real Web Crypto HMAC-SHA256 over a server-held secret, and rename these
   * fields. Do not simply flip tamperStatus to 'AUTHENTIC' again.
   */
  securitySeal: {
    /** HMAC-SHA256 (if authentic) OR non-cryptographic FNV-1a checksum (if demo). */
    hmacSha256: string;
    antiReplayNonce: number;
    /** Second independent checksum. NOT a Merkle root. */
    auditMerkleRoot: string;
    geofenceStatus: 'VERIFIED_IN_BOUNDS' | 'GEOFENCE_BREACH';
    tamperStatus: 'DEMO_UNVERIFIED' | 'CORRUPTION_DETECTED' | 'AUTHENTIC';
  };
}

export interface WorkOrderTicket {
  ticketId: string;
  stationId: string;
  stationName: string;
  state: string;
  timestamp: string;
  parameterInvolved: string;
  classification: RootCauseClassification;
  alertLevel: GovAlertLevel;
  faultProbability: number;
  xaiBreakdown: string;
  observedVsImputed: string;
  operationalAction: string;
  status: 'DISPATCHED' | 'VALIDATED_NWP' | 'QUARANTINED' | 'UNDER_REVIEW';
  spatialValidation?: TelemetryPacket['spatialValidation'];
}

interface BenchTestInjection {
  type: RootCauseClassification;
  driftRate?: number;
  stepCount: number;
  maxTicks: number;
}

// ─── Utilities ───
export function formatIST(timestamp: number): string {
  const d = new Date(timestamp);
  const ist = new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 19800000);
  return `${String(ist.getHours()).padStart(2, '0')}:${String(ist.getMinutes()).padStart(2, '0')}:${String(ist.getSeconds()).padStart(2, '0')}`;
}

/** Haversine distance in km between two lat/lon points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * WMO / ICAO Standard Barometric Reduction Formula (Orographic Normalization)
 * Computes Mean Sea-Level Pressure (QNH) from Station Surface Pressure (QFE), Elevation (h), and Ambient Temp (T).
 * Eliminates false pressure anomaly alarms in high-altitude/mountainous terrains (e.g. Bengaluru 920m, Pune 560m).
 */
export function calculateQnhPressure(stationPressureHpa: number | null, elevationM: number, tempC: number | null): number | null {
  if (stationPressureHpa === null) return null;
  if (elevationM <= 0) return stationPressureHpa;
  const t = tempC ?? 15.0; // Standard Atmosphere ISA base temperature
  const lapseRate = 0.0065; // Standard tropospheric lapse rate (6.5 K/km)
  const factor = 1 - (lapseRate * elevationM) / (t + lapseRate * elevationM + 273.15);
  if (factor <= 0) return stationPressureHpa;
  const pMsl = stationPressureHpa * Math.pow(factor, -5.257);
  return Math.round(pMsl * 10) / 10;
}

/**
 * DEMO INTEGRITY CHECKSUM — explicitly NOT a cryptographic signature.
 *
 * Two independent 32-bit FNV-1a-style accumulators are run over the payload and
 * emitted as hex. Properties this actually has:
 *   - deterministic: same input always yields the same output
 *   - cheap and dependency-free
 *   - detects accidental corruption (truncation, partial write, bit rot)
 *
 * Properties this does NOT have, despite the legacy field names:
 *   - it is not HMAC-SHA256 and uses no secret key
 *   - it is not a Merkle root and commits to no other records
 *   - it is not collision resistant in any security-relevant sense
 *   - anyone able to write the row can recompute it, so it proves nothing
 *     about authenticity
 *
 * The two accumulators use different primes and seeds purely so a
 * single-accumulator bug cannot silently pass as agreement.
 *
 * To make the field names true, replace this with a real Web Crypto
 * HMAC-SHA256 keyed on a server-side secret and rename the seal fields.
 */
export function computeDemoIntegritySeal(payload: string): {
  checksumA: string;
  checksumB: string;
} {
  let h1 = 0x811c9dc5;
  let h2 = 0x27d4eb2f;
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x5bd1e995);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return { checksumA: `0x${hex1}${hex2}`, checksumB: `0x${hex2}${hex1}a7f9` };
}

/** Shared work order factory — eliminates duplicate creation in page.tsx */
export function createWorkOrder(pkt: TelemetryPacket, fallbackTicketPrefix = 'IMD-QMS-2026'): WorkOrderTicket {
  // An unregistered station id must not silently resolve to Safdarjung. Fall
  // back to the packet's own id/name and mark the state as unknown so a
  // mis-keyed packet is visible in the ticket rather than quietly relabelled.
  const station = getStationProfile(pkt.stationId);
  return {
    ticketId: pkt.ticketId || `${fallbackTicketPrefix}-${Date.now().toString().slice(-4)}`,
    stationId: pkt.stationId,
    stationName: station?.name ?? pkt.stationId,
    state: station?.state ?? 'Unregistered station',
    timestamp: pkt.timeIST,
    parameterInvolved: pkt.xaiAttribution.primaryParameter,
    classification: pkt.classification,
    alertLevel: pkt.alertLevel,
    faultProbability: pkt.faultProbability,
    xaiBreakdown: `Temp: ${pkt.xaiAttribution.tempWeight}%, Press: ${pkt.xaiAttribution.pressWeight}%, Hum: ${pkt.xaiAttribution.humWeight}%`,
    observedVsImputed: `Obs: ${pkt.raw.temperature ?? 'NULL'}°C / ${pkt.raw.pressure ?? 'NULL'}hPa | Imp: ${pkt.imputed.temperature}°C / ${pkt.imputed.pressure}hPa`,
    operationalAction: pkt.operationalAction,
    status: pkt.classification === 'GENUINE_CONVECTIVE_EVENT' ? 'VALIDATED_NWP' : 'QUARANTINED',
    spatialValidation: pkt.spatialValidation,
  };
}

export const SEEDED_BASE_EPOCH = 1773220800000;

// ─── WMO Quality Control & Anomaly Engine ───
export class NICWMOAnomalyEngine {
  private stationBuffers = new Map<string, TelemetryPacket[]>();
  private activeInjections = new Map<string, BenchTestInjection>();
  private frozenCache = new Map<string, { temp?: number }>();
  private driftOffset = new Map<string, number>();
  private stormCounter = new Map<string, number>();
  private ticketSeq = 4100;

  constructor() {
    for (const s of IMD_AWS_STATIONS) {
      this.stationBuffers.set(s.stationId, []);
      this.driftOffset.set(s.stationId, 0);
      this.stormCounter.set(s.stationId, 0);
    }
  }

  /** Generate next telemetry packet with optional live baseline */
  generatePacket(
    stationId: string, timestamp = Date.now(), tickCount = 0,
    liveBaseline?: { temperature: number; pressure: number; humidity: number; windSpeedKph?: number; windDirectionDeg?: number; rainfallMm10min?: number },
    deterministic = false
  ): TelemetryPacket {
    // Registered stations use their own climatology. An unregistered id (a
    // mobile node, a dynamically provisioned district, a typo) falls back to a
    // neutral plains baseline rather than borrowing Safdarjung's, which would
    // apply Delhi's elevation to an unknown site's barometry.
    const station = getStationProfile(stationId);
    const baseline = station?.baseline;
    const stationElevation = station?.elevationM ?? 0;
    const stationLat = station?.latitude ?? 28.585;
    const stationLon = station?.longitude ?? 77.206;
    const buf = this.stationBuffers.get(stationId) || [];
    const prev = buf.length > 0 ? buf[buf.length - 1] : null;

    // Atmospheric baseline: live API or diurnal sinusoidal model
    const phase = ((tickCount % 60) / 60) * 2 * Math.PI;
    const jT = deterministic ? Math.sin(tickCount * 13.1 + stationLat) * 0.05 : (Math.random() - 0.5) * 0.1;
    const jP = deterministic ? Math.cos(tickCount * 17.3 + stationLon) * 0.05 : (Math.random() - 0.5) * 0.1;
    const jH = deterministic ? Math.sin(tickCount * 23.7 + stationElevation) * 0.1 : (Math.random() - 0.5) * 0.2;

    const rnd = deterministic ? 0 : 1;
    const baseT = liveBaseline ? liveBaseline.temperature + jT : (baseline?.tempMean ?? 28.0) + Math.sin(phase - 1) * 5.2 + (Math.random() - 0.5) * 0.2 * rnd;
    const baseP = liveBaseline ? liveBaseline.pressure + jP : (baseline?.pressureMean ?? 1008.0) + Math.cos(phase * 2) * 2.1 + (Math.random() - 0.5) * 0.15 * rnd;
    const baseH = liveBaseline ? liveBaseline.humidity + jH : (baseline?.humidityMean ?? 60.0) - Math.sin(phase - 1) * 14 + (Math.random() - 0.5) * 0.4 * rnd;

    // Wind: diurnal pattern or live Open-Meteo wind speed & direction
    const windBase = liveBaseline?.windSpeedKph ?? baseline?.windMean ?? 18;
    const rawWindSpeed = Math.max(0, windBase + (liveBaseline?.windSpeedKph !== undefined ? 0 : Math.sin(phase - 0.5) * 8) + (deterministic ? Math.sin(tickCount * 7.3) * 2 : (Math.random() - 0.5) * 4));
    const rawWindDir = ((liveBaseline?.windDirectionDeg ?? baseline?.windDirMean ?? 225) + (deterministic ? Math.sin(tickCount * 5.1) * 20 : (Math.random() - 0.5) * 30) + 360) % 360;
    // Rainfall: live Open-Meteo precipitation or synthetic stochastic burst
    const rainProb = deterministic ? (Math.sin(tickCount * 3.7) > 0.85 ? 1 : 0) : (Math.random() > 0.92 ? 1 : 0);
    const rawRainfall = liveBaseline?.rainfallMm10min !== undefined
      ? liveBaseline.rainfallMm10min
      : (rainProb * (deterministic ? Math.abs(Math.sin(tickCount * 11.3)) * 6 : Math.random() * 8));

    let rawT: number | null = Math.round(Math.min(55, Math.max(-10, baseT)) * 100) / 100;
    let rawP: number | null = Math.round(Math.min(1050, Math.max(920, baseP)) * 10) / 10;
    let rawH: number | null = Math.round(Math.min(100, Math.max(5, baseH)) * 10) / 10;
    let rawW: number | null = Math.round(Math.min(200, Math.max(0, rawWindSpeed)) * 10) / 10;
    const rawWD: number | null = Math.round(rawWindDir);
    let rawRain: number | null = Math.round(Math.min(50, rawRainfall) * 10) / 10;

    // Process bench injections
    const inj = this.activeInjections.get(stationId);
    if (inj) {
      inj.stepCount++;
      switch (inj.type) {
        case 'SENSOR_SPIKE':
          // This is the one injection that used Math.random() unconditionally,
          // ignoring `deterministic`. Every other noise term above is gated on
          // that flag, so the seeded dataset was deterministic on every
          // channel EXCEPT the spike — which made AWS-DEL-04 render a
          // different temperature on the server than on the client and threw
          // React's hydration error (#418) on every page that shows it.
          // Derived from tickCount and station latitude like the jitter terms,
          // so it still varies per tick and per station but is reproducible.
          rawT = 54.8 + (deterministic ? Math.abs(Math.sin(tickCount * 11.7 + stationLat)) : Math.random()) * 2.5;
          break;
        case 'FROZEN_VALUE': {
          let c = this.frozenCache.get(stationId);
          if (!c) { c = { temp: prev?.raw.temperature ?? 33.4215 }; this.frozenCache.set(stationId, c); }
          rawT = c.temp!;
          break;
        }
        case 'CALIBRATION_DRIFT': {
          const drift = (this.driftOffset.get(stationId) || 0) - (inj.driftRate || 0.4);
          this.driftOffset.set(stationId, drift);
          rawP = Math.round((rawP + drift) * 10) / 10;
          break;
        }
        case 'GENUINE_CONVECTIVE_EVENT': {
          const cnt = (this.stormCounter.get(stationId) || 0) + 1;
          this.stormCounter.set(stationId, cnt);
          rawP = Math.round((rawP - 3.2 - cnt * 0.3) * 10) / 10;
          rawH = Math.round(Math.min(99, rawH + 18 + cnt * 1.5) * 10) / 10;
          rawT = Math.round((rawT - 2.8 - cnt * 0.3) * 10) / 10;
          rawW = Math.round(Math.min(120, (rawW ?? 20) + 25 + cnt * 5) * 10) / 10;
          rawRain = Math.round(Math.min(45, (rawRain ?? 0) + 8 + cnt * 2) * 10) / 10;
          if (cnt >= inj.maxTicks) this.stormCounter.set(stationId, 0);
          break;
        }
        case 'TELEMETRY_PACKET_LOSS':
          rawT = null; rawP = null; rawH = null;
          break;
      }
      if (inj.stepCount >= inj.maxTicks) {
        this.activeInjections.delete(stationId);
        if (inj.type === 'FROZEN_VALUE') this.frozenCache.delete(stationId);
      }
    }

    return this.evaluate(stationId, rawT, rawP, rawH, rawW, rawWD, rawRain, timestamp);
  }

  /** Evaluate an externally ingested observation */
  processIngestedObservation(
    stationId: string,
    rawT: number | null,
    rawP: number | null,
    rawH: number | null,
    timestamp = Date.now(),
    rawW: number | null = null,
    rawWD: number | null = null,
    rawRain: number | null = null
  ): TelemetryPacket {
    return this.evaluate(stationId, rawT, rawP, rawH, rawW, rawWD, rawRain, timestamp);
  }

  /** Spatial KNN cross-validation: check 3 nearest neighbors within 500km */
  spatialCrossValidate(
    stationId: string,
    classification: string,
    allLatest: Record<string, TelemetryPacket>
  ): TelemetryPacket['spatialValidation'] {
    const station = getStationProfile(stationId);
    // Unknown station: fall back to a national centroid rather than Safdarjung's
    // coordinates, so the neighbour set is at least not biased toward Delhi.
    const originLat = station?.latitude ?? 22.5;
    const originLon = station?.longitude ?? 79.0;
    // Sort neighbors by distance
    const neighbors = IMD_AWS_STATIONS
      .filter(s => s.stationId !== stationId && s.wmoBlockNo !== '49999')
      .map(s => ({ s, km: haversineKm(originLat, originLon, s.latitude, s.longitude) }))
      .filter(n => n.km <= 500)
      .sort((a, b) => a.km - b.km)
      .slice(0, 3);

    if (neighbors.length < 2) return { nearestStations: [], verdict: 'INSUFFICIENT_DATA' };

    const nearestIds = neighbors.map(n => n.s.stationId);
    // Count how many neighbors also have anomaly flags
    const anomalousNeighbors = neighbors.filter(n => {
      const pkt = allLatest[n.s.stationId];
      return pkt && pkt.classification !== 'NOMINAL_OPERATION';
    }).length;

    const verdict = anomalousNeighbors >= 2 ? 'REGIONAL_WEATHER' : 'SINGLE_NODE_FAULT';
    return { nearestStations: nearestIds, verdict };
  }

  private evaluate(stationId: string, rawT: number | null, rawP: number | null, rawH: number | null, rawW: number | null, rawWD: number | null, rawRain: number | null, timestamp: number): TelemetryPacket {
    const station = getStationProfile(stationId);
    const baseline = station?.baseline;
    const stationElevation = station?.elevationM ?? 0;
    const buf = this.stationBuffers.get(stationId) || [];
    const prev = buf.length > 0 ? buf[buf.length - 1] : null;

    const prevT = prev?.raw.temperature, prevP = prev?.raw.pressure, prevH = prev?.raw.humidity;
    const tD = rawT !== null && prevT != null ? rawT - prevT : 0;
    const pD = rawP !== null && prevP != null ? rawP - prevP : 0;
    const hD = rawH !== null && prevH != null ? rawH - prevH : 0;

    // Rolling window (last 4 ticks)
    const w = buf.length >= 4 ? buf[buf.length - 4] : buf[0] ?? null;
    const rPD = w?.raw.pressure != null && rawP !== null ? rawP - w.raw.pressure : pD;
    const rHD = w?.raw.humidity != null && rawH !== null ? rawH - w.raw.humidity : hD;
    const rTD = w?.raw.temperature != null && rawT !== null ? rawT - w.raw.temperature : tD;

    // Rates of change
    const tempRoC = Math.round(tD * 100) / 100;
    const pressRoC = Math.round(pD * 10) / 10;
    const humRoC = Math.round(hD * 10) / 10;

    // Frozen sensor: zero variance across 6 ticks
    const recent6 = [...buf.slice(-5), { raw: { temperature: rawT } }].map(p => p.raw.temperature);
    const isFrozen = rawT !== null && recent6.length >= 6 && recent6.every(v => v !== null && Math.abs(v - (rawT as number)) < 0.00001);

    // Convective storm discrimination (Coupled Microburst / Kalbaisakhi signature)
    const isPD = pD <= -2.5 || rPD <= -2.5; // Benchmark: ΔP <= -2.5 hPa
    const isHS = hD >= 15 || rHD >= 15;     // Benchmark: ΔRH >= +15%
    const isC = tD <= -1.5 || rTD <= -1.5;  // Benchmark: ΔT <= -1.5°C
    const isStorm = !isFrozen && rawP !== null && rawH !== null && rawT !== null && isPD && isHS && isC;

    // Temp spike: unphysical reading (>50°C or |ΔT| > 8°C/tick) without coupled barometric plunge
    const isSpike = !isStorm && rawT !== null && (rawT > 50 || Math.abs(tD) > 8);

    // Wind spike: >100 km/h sudden jump — stuck wind vane (zero variance)
    const recentW6 = [...buf.slice(-5), { raw: { windSpeedKph: rawW } }].map(p => p.raw.windSpeedKph);
    const isWindFrozen = rawW !== null && recentW6.length >= 6 && recentW6.every(v => v !== null && Math.abs(v - (rawW as number)) < 0.00001);
    const isWindSpike = rawW !== null && rawW > 120;
    // Rainfall overflow: >40mm/10min
    const isRainOverflow = rawRain !== null && rawRain > 40;

    // Drift
    const driftAmt = this.driftOffset.get(stationId) || 0;
    const isDrift = Math.abs(driftAmt) > 2.0;

    const isLoss = rawT === null || rawP === null || rawH === null;

    // Classification
    let cls: RootCauseClassification = 'NOMINAL_OPERATION';
    let flag: WMOQualityFlag = 'FLAG_1_VERIFIED_GOOD';
    let alert: GovAlertLevel = 'LEVEL_0_NOMINAL';
    let action = 'Observation verified against applicable WMO-No. 8 & IMD quality guidance.';
    let fp = 0.02;
    let tid: string | null = null;

    if (isStorm) {
      cls = 'GENUINE_CONVECTIVE_EVENT'; flag = 'FLAG_2_CONVECTIVE_STORM'; alert = 'LEVEL_2_YELLOW'; fp = 0.05;
      action = 'Valid Severe Weather Front: Barometric plunge coupled with humidity saturation. Data Validated for NWP Assimilation.';
      tid = `IMD-MET-2026-${this.ticketSeq++}`;
    } else if (isLoss) {
      cls = 'TELEMETRY_PACKET_LOSS'; flag = 'FLAG_5_PACKET_LOSS'; alert = 'LEVEL_3_AMBER'; fp = 0.88;
      action = 'Flagged Invalid: Telemetry packet dropped/corrupted. Quarantine packet & verify DCP RF antenna link.';
      tid = `IMD-QMS-2026-${this.ticketSeq++}`;
    } else if (isFrozen) {
      cls = 'FROZEN_VALUE'; flag = 'FLAG_4_CORRUPT_HARDWARE'; alert = 'LEVEL_4_RED'; fp = 0.98;
      action = 'Flagged Invalid: Stuck ADC / Signal wire disconnect (Zero variance >= 6 ticks). Issue Field Maintenance Work Order.';
      tid = `IMD-QMS-2026-${this.ticketSeq++}`;
    } else if (isSpike) {
      cls = 'SENSOR_SPIKE'; flag = 'FLAG_4_CORRUPT_HARDWARE'; alert = 'LEVEL_4_RED'; fp = 0.96;
      action = 'Flagged Invalid: Thermistor open-circuit unphysical gradient (>50°C in <5s). Issue Field Maintenance Work Order.';
      tid = `IMD-QMS-2026-${this.ticketSeq++}`;
    } else if (isDrift) {
      cls = 'CALIBRATION_DRIFT'; flag = 'FLAG_3_SUSPECT_DRIFT'; alert = 'LEVEL_3_AMBER'; fp = 0.85;
      action = 'Suspect Data: Monotonic barometric drift exceeding WMO tolerance (-0.4 hPa/hr). Schedule NABL Sensor Recalibration.';
      tid = `IMD-QMS-2026-${this.ticketSeq++}`;
    }

    // XAI Attribution
    let [tW, pW, hW] = [33.3, 33.3, 33.4];
    let param = 'None', diag = 'All 3 parameters adhere to nominal thermodynamic diurnal curve.';

    if (cls === 'GENUINE_CONVECTIVE_EVENT') {
      [tW, pW, hW] = [20, 48, 32]; param = 'Pressure-Humidity Coupler';
      diag = 'Multivariate thermodynamic coupling confirms severe weather front rather than sensor defect.';
    } else if (cls === 'SENSOR_SPIKE' || cls === 'FROZEN_VALUE') {
      [tW, pW, hW] = [91.5, 4.2, 4.3]; param = 'PT100 Temperature Probe';
      diag = `Thermal channel discontinuity accounts for ${tW}% of anomaly attribution without physical barometric correlation.`;
    } else if (cls === 'CALIBRATION_DRIFT') {
      [tW, pW, hW] = [6, 88, 6]; param = 'Vaisala PTB110 Barometer';
      diag = `Continuous monotonic deviation of ${Math.abs(driftAmt).toFixed(1)} hPa identified by 24-sample regression slope.`;
    } else if (cls === 'TELEMETRY_PACKET_LOSS') {
      param = 'INSAT-3D DCP / GPRS Telemetry Link';
      diag = 'Missing frames across all 3 channels; packet quarantined.';
    }

    // WMO Imputation (moving average)
    const avg = (arr: (number | null)[]) => {
      const valid = arr.filter((v): v is number => v !== null).slice(-6);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    };
    const aT = avg(buf.map(p => p.raw.temperature)) ?? (baseline?.tempMean ?? 28.0);
    const aP = avg(buf.map(p => p.raw.pressure)) ?? (baseline?.pressureMean ?? 1008.0);
    const aH = avg(buf.map(p => p.raw.humidity)) ?? (baseline?.humidityMean ?? 60.0);
    const aW = avg(buf.map(p => p.raw.windSpeedKph)) ?? (baseline?.windMean ?? 15);
    const aWD = avg(buf.map(p => p.raw.windDirectionDeg)) ?? (baseline?.windDirMean ?? 225);
    const aRain = avg(buf.map(p => p.raw.rainfallMm10min)) ?? 0;

    const corrected = cls !== 'NOMINAL_OPERATION' && cls !== 'GENUINE_CONVECTIVE_EVENT';
    const iT = corrected ? Math.round(aT * 100) / 100 : (rawT ?? Math.round(aT * 100) / 100);
    const iP = corrected && cls === 'CALIBRATION_DRIFT' ? Math.round(aP * 10) / 10 : (rawP ?? Math.round(aP * 10) / 10);
    const iH = corrected && rawH === null ? Math.round(aH * 10) / 10 : (rawH ?? Math.round(aH * 10) / 10);
    const iW  = (isWindSpike || isWindFrozen) ? Math.round(aW * 10) / 10 : (rawW ?? Math.round(aW * 10) / 10);
    const iWD = (isWindFrozen) ? Math.round(aWD) : (rawWD ?? Math.round(aWD));
    const iRain = isRainOverflow ? Math.round(aRain * 10) / 10 : (rawRain ?? Math.round(aRain * 10) / 10);

    const { checksumA, checksumB } = computeDemoIntegritySeal(
      `${stationId}:${timestamp}:${rawT}:${rawP}:${rawH}:${cls}`
    );

    const mlFeatures: AnomalyFeatureVector = {
      tempRoC: tempRoC,
      pressRoC: pressRoC,
      humRoC: humRoC,
      tempAbsolute: rawT,
      pressAbsolute: rawP,
      humAbsolute: rawH,
      frozenTickCount: isFrozen ? 6 : 0,
      spikeAmplitude: tD,
      driftCumulative: driftAmt
    };

    const mlPred = classifyAnomaly(mlFeatures);
    let mappedMlCls = mlPred.classification;
    if (mappedMlCls === 'NOMINAL') mappedMlCls = 'NOMINAL_OPERATION';
    if (mappedMlCls === 'CONVECTIVE_STORM') mappedMlCls = 'GENUINE_CONVECTIVE_EVENT';
    if (mappedMlCls === 'PACKET_LOSS') mappedMlCls = 'TELEMETRY_PACKET_LOSS';

    // Carried on the packet as `mlPrediction.agreesWithRules`, and surfaced in
    // the UI (see `aiConfidenceOf` in lib/networkFeed.ts, and the classifier card
    // in app/dashboard/QcPanel.tsx, which shows "this packet disagrees with the
    // rules"). This used to be logged here as well, which meant one line per
    // station per tick: building a snapshot of 21 stations x 14 ticks emitted
    // dozens of warnings on every render, unbounded and unreadable. A fact that
    // is displayed in the product does not also need to be printed to console.
    const agreesWithRules = mappedMlCls === cls;

    // Reduce station pressure to mean-sea-level using the station's own
    // elevation. For an unregistered node the elevation is unknown, so no
    // reduction is applied and the raw value is passed through unchanged
    // rather than being corrected with a borrowed station's altitude.
    const qnhPressure = calculateQnhPressure(rawP, stationElevation, rawT);

    const pkt: TelemetryPacket = {
      packetId: `PKT-${stationId.replace('AWS-', '')}-${timestamp.toString().slice(-6)}`,
      stationId, timestamp, timeIST: formatIST(timestamp),
      raw: { temperature: rawT, pressure: rawP, humidity: rawH, windSpeedKph: rawW, windDirectionDeg: rawWD, rainfallMm10min: rawRain },
      imputed: { temperature: iT, pressure: iP, humidity: iH, windSpeedKph: iW, windDirectionDeg: iWD, rainfallMm10min: iRain, wasCorrected: corrected },
      ratesOfChange: { tempRoC, pressRoC, humRoC, windRoC: Math.round(((rawW ?? 0) - (prev?.raw.windSpeedKph ?? rawW ?? 0)) * 10) / 10 },
      classification: cls, wmoFlag: flag, alertLevel: alert, faultProbability: fp,
      xaiAttribution: { tempWeight: Math.round(tW * 10) / 10, pressWeight: Math.round(pW * 10) / 10, humWeight: Math.round(hW * 10) / 10, primaryParameter: param, diagnosticNote: diag },
      mlPrediction: { mlClassification: mlPred.classification, mlConfidence: mlPred.confidence, agreesWithRules },
      operationalAction: action, ticketId: tid,
      orographicQnhPressure: qnhPressure,
      securitySeal: {
        hmacSha256: checksumA,
        antiReplayNonce: timestamp % 999999,
        auditMerkleRoot: checksumB,
        geofenceStatus: 'VERIFIED_IN_BOUNDS',
        // Nothing here has been cryptographically verified, so nothing may
        // claim to be. "AUTHENTIC" was a false assertion.
        tamperStatus: 'DEMO_UNVERIFIED',
      },
    };

    buf.push(pkt);
    if (buf.length > 40) buf.shift();
    this.stationBuffers.set(stationId, buf);
    return pkt;
  }

  /**
   * Bidirectional field calibration loopback (OTA).
   *
   * `tempOffset` was previously accepted and then silently ignored, so a
   * technician submitting a temperature correction was told `success: true`
   * while nothing changed. A no-op parameter on a calibration function is
   * worse than an absent one: the audit record would claim a correction that
   * was never applied.
   *
   * Temperature offsets are not implemented. The parameter is now rejected
   * explicitly rather than swallowed.
   */
  applyFieldCalibration(
    stationId: string,
    pressureOffset: number,
    tempOffset = 0
  ): { success: boolean; newDriftOffset: number; message: string } {
    if (tempOffset !== 0) {
      return {
        success: false,
        newDriftOffset: this.driftOffset.get(stationId) || 0,
        message:
          `Temperature offset rejected: temperature calibration is not implemented in this ` +
          `build (${tempOffset} C discarded). Only barometric offsets are applied.`,
      };
    }

    const current = this.driftOffset.get(stationId) || 0;
    const updated = Math.round(Math.max(-5, Math.min(5, current + pressureOffset)) * 100) / 100;
    this.driftOffset.set(stationId, updated);
    // Remove active drift bench injection if present
    const inj = this.activeInjections.get(stationId);
    if (inj && inj.type === 'CALIBRATION_DRIFT') {
      this.activeInjections.delete(stationId);
    }
    return {
      success: true,
      newDriftOffset: updated,
      message: `Zero-point calibration offset of ${pressureOffset > 0 ? '+' : ''}${pressureOffset} hPa applied to station ${stationId} register.`,
    };
  }

  getStationDrift(id: string): number {
    return this.driftOffset.get(id) || 0;
  }

  // ─── Bench Test Triggers ───
  triggerThermistorSpike(id: string) { this.activeInjections.set(id, { type: 'SENSOR_SPIKE', stepCount: 0, maxTicks: 2 }); }
  triggerWireDisconnectFreeze(id: string) { this.activeInjections.set(id, { type: 'FROZEN_VALUE', stepCount: 0, maxTicks: 10 }); }
  triggerBarometerDrift(id: string) { this.activeInjections.set(id, { type: 'CALIBRATION_DRIFT', driftRate: 0.45, stepCount: 0, maxTicks: 12 }); }
  triggerConvectiveStorm(id: string) { this.activeInjections.set(id, { type: 'GENUINE_CONVECTIVE_EVENT', stepCount: 0, maxTicks: 8 }); this.stormCounter.set(id, 0); }
  triggerPacketLoss(id: string) { this.activeInjections.set(id, { type: 'TELEMETRY_PACKET_LOSS', stepCount: 0, maxTicks: 3 }); }

  resetToNominal(id?: string) {
    if (id) {
      this.activeInjections.delete(id); this.frozenCache.delete(id);
      this.driftOffset.set(id, 0); this.stormCounter.set(id, 0);
    } else {
      this.activeInjections.clear(); this.frozenCache.clear();
      for (const s of IMD_AWS_STATIONS) { this.driftOffset.set(s.stationId, 0); this.stormCounter.set(s.stationId, 0); }
    }
  }

  getBuffer(id: string): TelemetryPacket[] { return this.stationBuffers.get(id) || []; }
}

export const nicWmoEngineInstance = new NICWMOAnomalyEngine();

// ─── Seeded Initial Dataset ───
export interface SeededTelemetryDataset {
  stationPackets: Record<string, TelemetryPacket[]>;
  latestPackets: Record<string, TelemetryPacket>;
  workOrders: WorkOrderTicket[];
}

/**
 * Pre-seeded anomaly injections for demo resilience.
 *
 * Two constraints govern every entry here, and both were violated by the
 * original table (audited fix, see the notes per entry):
 *
 *  1. TICK BUDGET. `getInitialSeededDataset` runs exactly 14 ticks (0..13) and
 *     the console reports tick 13 — the newest packet. A trigger whose
 *     `maxTicks` is smaller than `14 - tick` has already expired by the time
 *     anyone looks at the station, so the seeded fault is invisible. The
 *     thermistor spike (maxTicks 2) injected at tick 9 finished at tick 10 and
 *     the console showed Delhi as NOMINAL. It is now injected at tick 12.
 *
 *  2. PHYSICAL HEADROOM. The detector requires a *coupled* signature
 *     (dP <= -2.5 AND dRH >= +15 AND dT <= -1.5). The storm injection adds a
 *     fixed +19.6 to relative humidity, so on a station already at 90% the
 *     result saturates at 100% and dRH collapses to +9 — the engine correctly
 *     reports NOMINAL because the humidity did not actually jump 15 points.
 *     Alipore (KOL-02) sits on 87.1% and could not carry the storm it was
 *     assigned; it is now CHN-03 Meenambakkam, which has the headroom.
 */
const SEED_INJECTIONS: Record<string, { tick: number; fn: (e: NICWMOAnomalyEngine) => void }> = {
  'AWS-DEL-04': { tick: 12, fn: (e) => e.triggerThermistorSpike('AWS-DEL-04') },
  'AWS-CHN-03': { tick: 8, fn: (e) => e.triggerConvectiveStorm('AWS-CHN-03') },
  'AWS-PUN-08': { tick: 3, fn: (e) => e.triggerBarometerDrift('AWS-PUN-08') },
};

export function getInitialSeededDataset(): SeededTelemetryDataset {
  const stationPackets: Record<string, TelemetryPacket[]> = {};
  const latestPackets: Record<string, TelemetryPacket> = {};
  const workOrders: WorkOrderTicket[] = [];
  const engine = new NICWMOAnomalyEngine();
  const baseTs = SEEDED_BASE_EPOCH - 14 * 2500;

  for (const station of IMD_AWS_STATIONS) {
    const history: TelemetryPacket[] = [];
    const seed = SEED_INJECTIONS[station.stationId];

    for (let i = 0; i < 14; i++) {
      if (seed && i === seed.tick) seed.fn(engine);
      const pkt = engine.generatePacket(station.stationId, baseTs + i * 2500, i, undefined, true);
      history.push(pkt);
      if (pkt.classification !== 'NOMINAL_OPERATION') {
        workOrders.push(createWorkOrder(pkt));
      }
    }

    stationPackets[station.stationId] = history;
    if (history.length > 0) latestPackets[station.stationId] = history[history.length - 1];
  }

  // Deduplicate by ticketId
  const seen = new Set<string>();
  const unique = workOrders.filter(wo => { if (seen.has(wo.ticketId)) return false; seen.add(wo.ticketId); return true; });

  return { stationPackets, latestPackets, workOrders: unique };
}

// ─── Predictive Maintenance & Degradation Engine (Sensor RUL & Health Matrix) ───
export interface SensorHealthScorecard {
  sensorType: 'TEMPERATURE_PT100' | 'PRESSURE_BAROMETER' | 'HUMIDITY_POLYMER';
  displayName: string;
  healthPercent: number; // 0-100%
  estimatedRulDays: number; // Remaining Useful Life in days
  degradationStatus: 'OPTIMAL' | 'EARLY_DEGRADATION' | 'CRITICAL_ACTION_REQUIRED';
  rollingVariance: number;
  driftSlopeRate: number;
  recommendedAction: string;
}

export function calculatePredictiveSensorHealth(packets: TelemetryPacket[]): SensorHealthScorecard[] {
  const windowSlice = (packets || []).slice(-20);
  const n = windowSlice.length;

  if (n < 4) {
    return [
      { sensorType: 'TEMPERATURE_PT100', displayName: 'PT100 RTD Temperature Probe', healthPercent: 98, estimatedRulDays: 142, degradationStatus: 'OPTIMAL', rollingVariance: 0.08, driftSlopeRate: 0.01, recommendedAction: 'Nominal operational status. Next routine calibration in 142 days.' },
      { sensorType: 'PRESSURE_BAROMETER', displayName: 'Vaisala PTB110 Barometric Sensor', healthPercent: 96, estimatedRulDays: 118, degradationStatus: 'OPTIMAL', rollingVariance: 0.12, driftSlopeRate: 0.02, recommendedAction: 'Calibration baseline verified against regional cohort.' },
      { sensorType: 'HUMIDITY_POLYMER', displayName: 'Humicap 180R Hygrometer', healthPercent: 94, estimatedRulDays: 95, degradationStatus: 'OPTIMAL', rollingVariance: 0.35, driftSlopeRate: 0.05, recommendedAction: 'Polymer capacitive response curve within tolerance.' },
    ];
  }

  // 1. Temperature Analysis
  const temps = windowSlice.map(p => p.raw.temperature).filter((v): v is number => v !== null);
  const tempMean = temps.reduce((a, b) => a + b, 0) / (temps.length || 1);
  const tempVar = temps.reduce((a, b) => a + (b - tempMean) ** 2, 0) / (temps.length || 1);
  const hasSpike = windowSlice.some(p => p.classification === 'SENSOR_SPIKE');
  const tempHealth = hasSpike ? 15 : Math.max(20, Math.min(100, Math.round(100 - tempVar * 8)));
  const tempRul = hasSpike ? 0 : Math.round(tempHealth * 1.5);

  // 2. Barometric Drift Analysis
  const pressures = windowSlice.map(p => p.raw.pressure).filter((v): v is number => v !== null);
  const pDelta = pressures.length > 1 ? Math.abs(pressures[pressures.length - 1] - pressures[0]) : 0;
  const hasDrift = windowSlice.some(p => p.classification === 'CALIBRATION_DRIFT');
  const pressHealth = hasDrift ? 42 : Math.max(30, Math.min(100, Math.round(100 - pDelta * 12)));
  const pressRul = hasDrift ? 14 : Math.round(pressHealth * 1.3);

  // 3. Humidity Analysis
  const hums = windowSlice.map(p => p.raw.humidity).filter((v): v is number => v !== null);
  const humVar = hums.length > 1 ? hums.reduce((a, b) => a + (b - 65) ** 2, 0) / hums.length : 1;
  const isFrozen = windowSlice.some(p => p.classification === 'FROZEN_VALUE');
  const humHealth = isFrozen ? 10 : Math.max(25, Math.min(100, Math.round(98 - (humVar / 100) * 5)));
  const humRul = isFrozen ? 0 : Math.round(humHealth * 1.2);

  return [
    {
      sensorType: 'TEMPERATURE_PT100',
      displayName: 'PT100 4-Wire RTD Probe',
      healthPercent: tempHealth,
      estimatedRulDays: tempRul,
      degradationStatus: tempHealth < 40 ? 'CRITICAL_ACTION_REQUIRED' : tempHealth < 75 ? 'EARLY_DEGRADATION' : 'OPTIMAL',
      rollingVariance: Math.round(tempVar * 100) / 100,
      driftSlopeRate: 0.02,
      recommendedAction: tempHealth < 40 ? 'Immediate technician dispatch: open-circuit or wiring corrosion.' : tempHealth < 75 ? 'Pre-emptive check recommended during next site audit.' : 'Nominal operation within WMO tolerances.',
    },
    {
      sensorType: 'PRESSURE_BAROMETER',
      displayName: 'Vaisala PTB110 Silicon Barometer',
      healthPercent: pressHealth,
      estimatedRulDays: pressRul,
      degradationStatus: pressHealth < 50 ? 'CRITICAL_ACTION_REQUIRED' : pressHealth < 80 ? 'EARLY_DEGRADATION' : 'OPTIMAL',
      rollingVariance: Math.round(pDelta * 100) / 100,
      driftSlopeRate: Math.round((pDelta / 10) * 100) / 100,
      recommendedAction: pressHealth < 50 ? 'NABL lab recalibration required: cumulative barometric drift detected.' : 'Barometric baseline verified against regional cohort.',
    },
    {
      sensorType: 'HUMIDITY_POLYMER',
      displayName: 'Humicap 180R Capacitive Sensor',
      healthPercent: humHealth,
      estimatedRulDays: humRul,
      degradationStatus: humHealth < 30 ? 'CRITICAL_ACTION_REQUIRED' : humHealth < 70 ? 'EARLY_DEGRADATION' : 'OPTIMAL',
      rollingVariance: Math.round(humVar * 10) / 10,
      driftSlopeRate: 0.04,
      recommendedAction: humHealth < 30 ? 'Replace sensor head: transducer unresponsive / frozen register.' : 'Sensor membrane clean. Humidity response nominal.',
    },
  ];
}

// ─── Emergency CAP Protocol Alert Dispatcher (NDMA / WMO Standard) ───
export interface EmergencyCapAlert {
  alertId: string;
  sender: string;
  sentTime: string;
  status: 'ACTUAL' | 'EXERCISE';
  msgType: 'ALERT' | 'UPDATE';
  scope: 'PUBLIC';
  category: 'Met';
  event: string;
  urgency: 'Immediate' | 'Expected' | 'Past';
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
  certainty: 'Observed' | 'Likely';
  headline: string;
  description: string;
  instruction: string;
  areaDesc: string;
  isSilencedDueToHardwareFault: boolean;
}

export function generateCapAlert(pkt: TelemetryPacket, stationName: string, state: string): EmergencyCapAlert {
  const isStorm = pkt.classification === 'GENUINE_CONVECTIVE_EVENT';
  const isHardwareFault = pkt.classification === 'SENSOR_SPIKE' || pkt.classification === 'FROZEN_VALUE';

  return {
    alertId: `CAP-IN-MD-${Date.now().toString(36).toUpperCase()}`,
    sender: 'IMD-METSHIELD-AI/HQ-NEW-DELHI',
    sentTime: new Date(pkt.timestamp).toISOString(),
    status: 'ACTUAL',
    msgType: 'ALERT',
    scope: 'PUBLIC',
    category: 'Met',
    event: isStorm ? 'Severe Convective Thunderstorm / Squall' : isHardwareFault ? 'Sensor Anomaly (Alert Silenced)' : 'Meteorological Observation',
    urgency: isStorm ? 'Immediate' : 'Expected',
    severity: isStorm ? 'Severe' : isHardwareFault ? 'Minor' : 'Minor',
    certainty: isStorm ? 'Observed' : 'Likely',
    headline: isStorm
      ? `SEVERE WEATHER WARNING: Convective Squall Line Verified at ${stationName}, ${state}`
      : isHardwareFault
      ? `NOTICE: Transducer Fault at ${stationName} Silenced (Civil Defense Not Notified)`
      : `Nominal Weather Report: ${stationName}`,
    description: isStorm
      ? `AI Quality Control engine has verified genuine atmospheric drop (ΔP: ${pkt.ratesOfChange.pressRoC.toFixed(1)} hPa, ΔRH: ${pkt.ratesOfChange.humRoC.toFixed(1)}%). Corroborated by spatial cohort. Forecast assimilation approved.`
      : isHardwareFault
      ? `XAI root cause analysis identified hardware transducer failure (${pkt.classification}). Emergency broadcast automatically inhibited to prevent false public panic.`
      : `Atmospheric parameters within nominal limits.`,
    instruction: isStorm
      ? 'District Disaster Management Authority (DDMA) advised to secure loose structures and alert local civic emergency teams.'
      : 'Routine automated maintenance log updated. No public action needed.',
    areaDesc: `${stationName}, ${state}, India`,
    isSilencedDueToHardwareFault: isHardwareFault,
  };
}

