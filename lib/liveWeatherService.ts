import { IMDStationProfile } from './stationData';

export interface LiveObservation {
  stationId: string;
  temperature: number;
  /**
   * MEAN SEA LEVEL pressure (QNH), in hPa.
   *
   * Open-Meteo reports `surface_pressure` (station pressure / QFE), which for
   * Shimla is ~790 hPa against a stored MSL baseline of 1014.2 hPa. Feeding the
   * raw QFE value to the QC engine produced a 224 hPa step on the first live
   * sample. Observations are therefore reduced to MSL here so that live values
   * and `IMDStationProfile.baseline.pressureMean` are on the same level.
   *
   * See __tests__/pressureLevelConsistency.test.ts.
   */
  pressure: number;
  /**
   * Un-reduced station pressure (QFE) as reported by the provider, when
   * available. Retained for audit; not fed to the QC engine.
   */
  stationPressure?: number;
  humidity: number;
  windSpeedKph?: number;
  windDirectionDeg?: number;
  rainfallMm10min?: number;
  timestamp: number;
  timeIST: string;
  source: 'OPEN_METEO_PUBLIC_API' | 'WEATHERSTACK_API' | string;
  isLive: boolean;
}

/**
 * WMO/ICAO standard atmosphere reduction: station pressure (QFE) -> MSL (QNH).
 *
 * Mirrors calculateQnhPressure() in lib/anomalyLogic.ts. Duplicated here on
 * purpose: that module is the engine, this is the ingestion boundary, and
 * importing the engine into the fetch path would pull the whole QC stack into
 * the live-weather bundle. Keep the two in sync — the barometric test in
 * __tests__/pressureLevelConsistency.test.ts covers the engine side.
 */
function reduceToMeanSeaLevel(
  stationPressureHpa: number,
  elevationM: number,
  tempC: number
): number {
  if (elevationM <= 0) return stationPressureHpa;
  const lapseRate = 0.0065; // K/m, standard tropospheric lapse rate
  const factor = 1 - (lapseRate * elevationM) / (tempC + lapseRate * elevationM + 273.15);
  if (factor <= 0) return stationPressureHpa;
  return Math.round(stationPressureHpa * Math.pow(factor, -5.257) * 10) / 10;
}

// In-memory cache for live station observations (60-second TTL)
const liveCache: Map<string, { data: LiveObservation; expiry: number }> = new Map();

function transformOpenMeteoCurrent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  current: any,
  stationId: string,
  now: number,
  elevationM = 0
): LiveObservation | null {
  if (!current || current.temperature_2m === undefined) return null;

  const temp = Math.round(Number(current.temperature_2m) * 10) / 10;
  // Open-Meteo's surface_pressure is station pressure (QFE). Baselines are MSL,
  // so reduce before storing, otherwise every elevated station shows a step
  // change of ~1 hPa per 27 m of elevation on its first live sample.
  const surfacePressure = Number(current.surface_pressure);
  const hasPressure = Number.isFinite(surfacePressure);
  const press = hasPressure
    ? reduceToMeanSeaLevel(surfacePressure, elevationM, temp)
    : 0;
  const hum = Math.round(Number(current.relative_humidity_2m) * 10) / 10;
  const windSpeed = current.wind_speed_10m !== undefined ? Math.round(Number(current.wind_speed_10m) * 10) / 10 : undefined;
  const windDir = current.wind_direction_10m !== undefined ? Math.round(Number(current.wind_direction_10m)) : undefined;
  const rain = current.precipitation !== undefined ? Math.round(Number(current.precipitation) * 10) / 10 : undefined;

  return {
    stationId,
    temperature: temp,
    pressure: press,
    ...(hasPressure ? { stationPressure: Math.round(surfacePressure * 10) / 10 } : {}),
    humidity: hum,
    windSpeedKph: windSpeed,
    windDirectionDeg: windDir,
    rainfallMm10min: rain,
    timestamp: now,
    timeIST: new Date(now).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    source: 'OPEN_METEO_PUBLIC_API',
    isLive: true,
  };
}

/**
 * Fetches real-time atmospheric measurements.
 * Automatically utilizes Weatherstack API when an API key is configured,
 * or seamlessly falls back to Open-Meteo Satellite & Surface Assimilation.
 */
export async function fetchLiveStationObservation(
  station: IMDStationProfile
): Promise<LiveObservation | null> {
  const cached = liveCache.get(station.stationId);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    return cached.data;
  }

  // 1. Try local server-side API proxy first (which checks for Weatherstack API Key)
  if (typeof window !== 'undefined') {
    try {
      const proxyUrl = `/api/weather?stationId=${encodeURIComponent(station.stationId)}&lat=${station.latitude.toFixed(3)}&lon=${station.longitude.toFixed(3)}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        const payload = await proxyRes.json();
        if (payload?.success && payload?.data) {
          const obs: LiveObservation = {
            stationId: station.stationId,
            temperature: payload.data.temperature,
            pressure: payload.data.pressure,
            humidity: payload.data.humidity,
            windSpeedKph: payload.data.windSpeedKph,
            windDirectionDeg: payload.data.windDirectionDeg,
            rainfallMm10min: payload.data.rainfallMm10min,
            timestamp: payload.data.timestamp || now,
            timeIST: payload.data.timeIST,
            source: payload.provider === 'WEATHERSTACK' ? 'WEATHERSTACK_API' : 'OPEN_METEO_PUBLIC_API',
            isLive: true,
          };
          liveCache.set(station.stationId, { data: obs, expiry: now + 60000 });
          return obs;
        }
      }
    } catch {
      // Fall through to direct fetch
    }
  }

  // 2. Direct Open-Meteo Meteorological Fetch fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${station.latitude.toFixed(3)}&longitude=${station.longitude.toFixed(3)}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation&timezone=Asia%2FKolkata`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    const observation = transformOpenMeteoCurrent(
      json?.current,
      station.stationId,
      now,
      station.elevationM
    );

    if (observation) {
      liveCache.set(station.stationId, {
        data: observation,
        expiry: now + 60000,
      });
    }

    return observation;
  } catch {
    // Graceful fallback to null if offline or blocked
    return null;
  }
}

/**
 * Fetches real-time atmospheric measurements for MULTIPLE stations in a single batch query
 * using Open-Meteo's multi-coordinate forecast endpoint.
 * Latency: < 450ms for 20 national stations, ₹0 cost, zero API keys.
 */
export async function fetchBatchLiveObservations(
  stations: IMDStationProfile[]
): Promise<Record<string, LiveObservation>> {
  const result: Record<string, LiveObservation> = {};
  if (!stations || stations.length === 0) return result;

  const now = Date.now();
  const unexpiredStations: IMDStationProfile[] = [];

  // Check in-memory cache first
  for (const st of stations) {
    const cached = liveCache.get(st.stationId);
    if (cached && cached.expiry > now) {
      result[st.stationId] = cached.data;
    } else {
      unexpiredStations.push(st);
    }
  }

  // If all stations are already cached, return immediately
  if (unexpiredStations.length === 0) {
    return result;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const lats = unexpiredStations.map((s) => s.latitude.toFixed(3)).join(',');
    const lons = unexpiredStations.map((s) => s.longitude.toFixed(3)).join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation&timezone=Asia%2FKolkata`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return result;
    }

    const json = await response.json();
    const dataList = Array.isArray(json) ? json : [json];

    for (let i = 0; i < unexpiredStations.length; i++) {
      const station = unexpiredStations[i];
      const entry = dataList[i];
      const obs = transformOpenMeteoCurrent(
        entry?.current,
        station.stationId,
        now,
        station.elevationM
      );

      if (obs) {
        liveCache.set(station.stationId, {
          data: obs,
          expiry: now + 60000,
        });
        result[station.stationId] = obs;
      }
    }
  } catch {
    // Gracefully preserve whatever cached stations exist
  }

  return result;
}

