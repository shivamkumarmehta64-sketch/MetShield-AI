/**
 * districtEngine.ts
 * AGENT 1 — DISTRICT DATA ENGINE
 *
 * Manages the all-India 766 district index, priority background queueing,
 * live Open-Meteo telemetry fetching with full parameters, and reactive hooks.
 */

import { ALL_766_DISTRICTS, IndiaDistrict } from './india766Districts';
import {
  LiveDistrictReading,
  HistoricalReading,
  SensorReport,
  runAllFaultChecks,
  DistrictHealthStatus,
  DistrictMeta
} from './sensorFaultEngine';
import { useState, useEffect, useCallback } from 'react';
import type { Provenance } from './dataProvenance';

export type DistrictFetchStatus = 'pending' | 'loading' | 'live' | 'stale' | 'error';

export interface DistrictLiveState {
  district: IndiaDistrict;
  status: DistrictFetchStatus;
  health: DistrictHealthStatus;
  reading: LiveDistrictReading | null;
  history: HistoricalReading[];
  qcReport: SensorReport | null;
  lastUpdated: number | null;
  /**
   * Where `reading` came from.
   *
   * CRITICAL: a district whose upstream fetch failed is served a synthetic
   * physical-model reading. Without this flag the UI could not tell that apart
   * from a real observation, and the old code went further and set
   * `status: 'live'` unconditionally — so an offline or rate-limited user saw
   * healthy-looking numbers labelled as live. `status` answers "did the request
   * succeed"; `provenance` answers "is this a measurement". Both are needed.
   */
  provenance: Provenance;
}

// Global in-memory cache for all 766 districts
const districtCache = new Map<string, DistrictLiveState>();

// Priority queue for fetching
interface QueueItem {
  districtId: string;
  priority: number; // higher = fetch sooner (user click = 100, user hover = 50, top50 = 10, bg = 1)
  addedAt: number;
}

const fetchQueue: QueueItem[] = [];
const queueStatus = new Map<string, DistrictFetchStatus>();
let isQueueWorkerRunning = false;
const listeners = new Set<() => void>();

let notifyTimeout: ReturnType<typeof setTimeout> | null = null;
let lastNotifyTime = 0;
const NOTIFY_THROTTLE_MS = 600;
let rateLimitBackoffUntil = 0;

export function notifySubscribers(immediate = false) {
  const now = Date.now();
  if (immediate || now - lastNotifyTime >= NOTIFY_THROTTLE_MS) {
    if (notifyTimeout) {
      clearTimeout(notifyTimeout);
      notifyTimeout = null;
    }
    lastNotifyTime = now;
    for (const fn of listeners) {
      try {
        fn();
      } catch (e) {
        console.error('Listener notification error:', e);
      }
    }
  } else if (!notifyTimeout) {
    notifyTimeout = setTimeout(() => {
      notifyTimeout = null;
      lastNotifyTime = Date.now();
      for (const fn of listeners) {
        try {
          fn();
        } catch (e) {
          console.error('Listener notification error:', e);
        }
      }
    }, NOTIFY_THROTTLE_MS - (now - lastNotifyTime));
  }
}

// Step 1 — Initialize districts registry
export function getInitialDistricts(): IndiaDistrict[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('vayu_districts_index');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= 700) {
          return parsed;
        }
      }
    } catch {
      // fallback to memory
    }
  }
  return ALL_766_DISTRICTS;
}

// Initialize cache with empty states
export function initializeDistrictEngine() {
  const districts = getInitialDistricts();
  for (const d of districts) {
    if (!districtCache.has(d.id)) {
      districtCache.set(d.id, {
        district: d,
        status: 'pending',
        health: 'LOADING',
        reading: null,
        history: [],
        qcReport: null,
        lastUpdated: null,
        // Nothing fetched yet, so nothing is known to be a measurement.
        provenance: 'SIMULATED'
      });
      queueStatus.set(d.id, 'pending');
    }
  }

  // Enqueue top 50 populated districts with priority 10
  const sorted = [...districts].sort((a, b) => (b.population || 0) - (a.population || 0));
  const top50 = sorted.slice(0, 50);
  for (const d of top50) {
    enqueueDistrictFetch(d.id, 10);
  }

  // Enqueue the rest with priority 1
  for (let i = 50; i < sorted.length; i++) {
    enqueueDistrictFetch(sorted[i].id, 1);
  }

  startQueueWorker();
}

// Enqueue district for fetching
export function enqueueDistrictFetch(districtId: string, priority = 1) {
  // Check if already in queue
  const existingIdx = fetchQueue.findIndex(q => q.districtId === districtId);
  if (existingIdx >= 0) {
    if (fetchQueue[existingIdx].priority < priority) {
      fetchQueue[existingIdx].priority = priority;
      fetchQueue.sort((a, b) => b.priority - a.priority);
    }
    return;
  }

  fetchQueue.push({
    districtId,
    priority,
    addedAt: Date.now()
  });

  // Sort highest priority first
  fetchQueue.sort((a, b) => b.priority - a.priority);
}

// High-fidelity physical atmospheric model generator for graceful degradation when external API is rate-limited
export function generatePhysicalDistrictTelemetry(d: IndiaDistrict): { reading: LiveDistrictReading; history: HistoricalReading[] } {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const istHours = (utcHours + 5.5) % 24;
  const isDay = istHours >= 6.0 && istHours <= 18.5;

  // Diurnal solar cycle calculation (peaking around 14:00-15:00 IST)
  const solarAngle = Math.sin(((istHours - 9) / 12) * Math.PI);
  const baseTemp = d.lat > 28 ? 27.5 : (d.isCoastal ? 30.5 : 31.5);
  const tempOffset = solarAngle * (d.isCoastal ? 3.5 : 6.0);
  const temp = Math.round((baseTemp + tempOffset) * 10) / 10;

  // Relative humidity inverse diurnal curve
  const baseRh = d.isCoastal ? 78 : 68;
  const rhOffset = -solarAngle * 18;
  const rh = Math.min(95, Math.max(38, Math.round(baseRh + rhOffset)));

  // Barometric pressure adjusted for station elevation and semi-diurnal atmospheric tide
  const elev = d.lat > 31 && d.lng < 78 ? 1600 : 150;
  const mslPressure = Math.round((1011.5 - (elev / 120) * 1.0 + Math.sin(istHours * 0.52) * 1.5) * 10) / 10;
  const sfcPressure = Math.round((mslPressure - (elev * 0.11)) * 10) / 10;

  // Magnus-Tetens dew point calculation
  const alpha = ((17.27 * temp) / (237.7 + temp)) + Math.log(rh / 100);
  const dewPoint = Math.round(((237.7 * alpha) / (17.27 - alpha)) * 10) / 10;

  const windSpeed = Math.round((7.5 + Math.abs(solarAngle) * 5.5 + (d.name.length % 4)) * 10) / 10;
  const windDir = (d.name.charCodeAt(0) * 45) % 360;
  const uvIndex = isDay ? Math.max(0, Math.round(Math.sin(((istHours - 6) / 12) * Math.PI) * 9.5)) : 0;

  const reading: LiveDistrictReading = {
    timestamp: now.toISOString(),
    temperature_2m: temp,
    relative_humidity_2m: rh,
    apparent_temperature: Math.round((temp + (rh > 60 ? (rh - 60) * 0.18 : 0)) * 10) / 10,
    precipitation: 0.0,
    weather_code: 1, // Mainly Clear
    pressure_msl: mslPressure,
    surface_pressure: sfcPressure,
    wind_speed_10m: windSpeed,
    wind_direction_10m: windDir,
    wind_gusts_10m: Math.round((windSpeed * 1.35) * 10) / 10,
    cloud_cover: isDay ? 35 : 20,
    visibility: 9500,
    uv_index: uvIndex,
    is_day: isDay ? 1 : 0,
    sunshine_duration: isDay ? 3600 : 0,
    dew_point_2m: dewPoint,
    freezing_level_height: 4700,
    lastPacketReceivedMs: Date.now(),
    fetchErrorCount: 0
  };

  const history: HistoricalReading[] = [];
  for (let i = 24; i >= 0; i--) {
    const hTime = new Date(Date.now() - i * 3600000);
    const hIst = (hTime.getUTCHours() + 5.5) % 24;
    const hSolar = Math.sin(((hIst - 9) / 12) * Math.PI);
    const hTemp = Math.round((baseTemp + hSolar * (d.isCoastal ? 3.5 : 6.0)) * 10) / 10;
    const hRh = Math.min(95, Math.max(38, Math.round(baseRh - hSolar * 18)));
    const hPress = Math.round((mslPressure + Math.sin(hIst * 0.52) * 1.5 + Math.cos(i * 0.3) * 0.4) * 10) / 10;
    const hWind = Math.round(Math.max(2, (windSpeed + Math.sin(i * 0.7) * 2.5)) * 10) / 10;
    const hWindDir = Math.round(((windDir || 90) + (i * 14) + 360) % 360);
    const hDew = Math.round((dewPoint + Math.sin(i * 0.4) * 0.8) * 10) / 10;

    history.push({
      timestamp: hTime.toISOString(),
      temperature: hTemp,
      humidity: hRh,
      pressure: hPress,
      wind_speed: hWind,
      wind_direction: hWindDir,
      precipitation: 0,
      dew_point: hDew,
      visibility: 9500
    });
  }

  return { reading, history };
}

// Step 2 — Open-Meteo live fetcher with graceful physical fallback on rate limit
export async function fetchDistrictFromOpenMeteo(d: IndiaDistrict): Promise<DistrictLiveState> {
  let reading: LiveDistrictReading;
  let history: HistoricalReading[] = [];
  let provenance: Provenance = 'LIVE';

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${d.lat.toFixed(4)}&longitude=${d.lng.toFixed(4)}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,` +
      `weather_code,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,` +
      `wind_gusts_10m,cloud_cover,visibility,uv_index,is_day,sunshine_duration,` +
      `dew_point_2m,freezing_level_height` +
      `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,` +
      `pressure_msl,wind_speed_10m,wind_direction_10m,uv_index,visibility,cloud_cover` +
      `&timezone=Asia/Kolkata&forecast_days=2`;

    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) {
      if (resp.status === 429) {
        rateLimitBackoffUntil = Date.now() + 30000;
      }
      throw new Error(`Open-Meteo HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const curr = data.current || {};
    const hourly = data.hourly || {};

    reading = {
      timestamp: curr.time || new Date().toISOString(),
      temperature_2m: curr.temperature_2m ?? null,
      relative_humidity_2m: curr.relative_humidity_2m ?? null,
      apparent_temperature: curr.apparent_temperature ?? null,
      precipitation: curr.precipitation ?? null,
      weather_code: curr.weather_code ?? null,
      pressure_msl: curr.pressure_msl ?? null,
      surface_pressure: curr.surface_pressure ?? null,
      wind_speed_10m: curr.wind_speed_10m ?? null,
      wind_direction_10m: curr.wind_direction_10m ?? null,
      wind_gusts_10m: curr.wind_gusts_10m ?? null,
      cloud_cover: curr.cloud_cover ?? null,
      visibility: curr.visibility ?? null,
      uv_index: curr.uv_index ?? null,
      is_day: curr.is_day ?? null,
      sunshine_duration: curr.sunshine_duration ?? null,
      dew_point_2m: curr.dew_point_2m ?? null,
      freezing_level_height: curr.freezing_level_height ?? null,
      lastPacketReceivedMs: Date.now(),
      fetchErrorCount: 0
    };

    if (Array.isArray(hourly.time)) {
      const len = Math.min(hourly.time.length, 48);
      for (let i = 0; i < len; i++) {
        history.push({
          timestamp: hourly.time[i],
          temperature: hourly.temperature_2m?.[i] ?? null,
          humidity: hourly.relative_humidity_2m?.[i] ?? null,
          pressure: hourly.pressure_msl?.[i] ?? null,
          wind_speed: hourly.wind_speed_10m?.[i] ?? null,
          wind_direction: hourly.wind_direction_10m?.[i] ?? null,
          precipitation: hourly.precipitation_probability?.[i] ?? null,
          dew_point: hourly.dew_point_2m?.[i] ?? null,
          visibility: hourly.visibility?.[i] ?? null
        });
      }
    }
  } catch {
    // Upstream fetch failed (network, 429, or malformed payload). Serve the
    // synthetic physical model so the UI still renders, but record that the
    // data is generated rather than observed.
    const fallback = generatePhysicalDistrictTelemetry(d);
    reading = fallback.reading;
    history = fallback.history;
    provenance = 'SIMULATED';
  }

  // Run all WMO & IMD sensor fault checks
  const meta: DistrictMeta = {
    id: d.id,
    name: d.name,
    state: d.state,
    lat: d.lat,
    lng: d.lng,
    population: d.population,
    elevation: d.elevation ?? 200,
    isCoastal: d.isCoastal
  };

  const qcReport = runAllFaultChecks(reading, history, meta);

  const state: DistrictLiveState = {
    district: d,
    // A simulated reading must not claim to be live. The request DID succeed
    // in the sense that we produced a value, but the value is not a
    // measurement, and 'live' is the one status a dashboard operator would read
    // as "this is real".
    status: provenance === 'SIMULATED' ? 'stale' : 'live',
    health: qcReport.overallStatus,
    reading,
    history,
    qcReport,
    lastUpdated: Date.now(),
    provenance
  };

  districtCache.set(d.id, state);
  queueStatus.set(d.id, state.status);
  return state;
}

// Background queue worker: processes items at a rate of 20 per second
function startQueueWorker() {
  if (isQueueWorkerRunning) return;
  isQueueWorkerRunning = true;

  const interval = setInterval(async () => {
    if (fetchQueue.length === 0) {
      return;
    }

    // If backed off due to 429, skip background batch
    if (Date.now() < rateLimitBackoffUntil) {
      // Only allow priority >= 50 (user action) during backoff
      const userItem = fetchQueue.find(q => q.priority >= 50);
      if (!userItem) return;
    }

    // Process up to 4 requests per tick (400ms tick = ~10 requests / sec, safe for Open-Meteo)
    const batch = fetchQueue.splice(0, 4);

    await Promise.allSettled(
      batch.map(async item => {
        const entry = districtCache.get(item.districtId);
        if (!entry) return;

        // If tab is hidden in background, skip low-priority items
        if (typeof document !== 'undefined' && document.hidden && item.priority < 50) {
          fetchQueue.push(item);
          return;
        }

        // Skip if already live and fetched less than 5 minutes ago, unless priority >= 50
        if (entry.status === 'live' && entry.lastUpdated && Date.now() - entry.lastUpdated < 300000 && item.priority < 50) {
          return;
        }

        entry.status = 'loading';
        queueStatus.set(item.districtId, 'loading');
        // Persist the intermediate state too, so a subscriber notified during
        // the fetch sees 'loading' rather than the previous value.
        districtCache.set(item.districtId, { ...entry });

        try {
          await fetchDistrictFromOpenMeteo(entry.district);
        } catch (err) {
          console.warn(`[DistrictEngine] Fetch failed for ${entry.district.name}:`, err);
          // The error state MUST be written back to the cache. Previously it
          // was only set on the local `entry` object, which was discarded —
          // so `districtCache` kept the last 'live' values and the UI
          // continued to display stale data as current, with no error shown.
          districtCache.set(item.districtId, {
            ...entry,
            status: 'error',
            health: 'OFFLINE',
            lastUpdated: entry.lastUpdated,
            // We have no observation at all now, so nothing here is measured.
            provenance: 'SIMULATED',
          });
          queueStatus.set(item.districtId, 'error');
        }
      })
    );

    notifySubscribers();
  }, 400);

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => clearInterval(interval));
  }
}

// Step 3 — Exported Core Functions & Hooks

/**
 * Hook to get real-time data, history, and QC report for a single district
 */
export function useDistrictData(districtId: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    // If not in cache, initialize
    if (districtCache.size === 0) {
      initializeDistrictEngine();
    }

    // High priority fetch if not loaded or stale
    const entry = districtCache.get(districtId);
    if (!entry || entry.status === 'pending' || entry.status === 'error') {
      enqueueDistrictFetch(districtId, 100);
    }

    const listener = () => setTick(t => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [districtId]);

  const state = districtCache.get(districtId) || null;

  const refresh = useCallback(() => {
    enqueueDistrictFetch(districtId, 100);
  }, [districtId]);

  return {
    district: state?.district || null,
    reading: state?.reading || null,
    history: state?.history || [],
    qcReport: state?.qcReport || null,
    health: state?.health || 'LOADING',
    status: state?.status || 'pending',
    lastUpdated: state?.lastUpdated || null,
    refresh
  };
}

/**
 * Hook to get all 766 districts with health status and severity
 */
export function useAllDistricts() {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (districtCache.size === 0) {
      initializeDistrictEngine();
    }
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const allDistricts = Array.from(districtCache.values());
  return allDistricts;
}

/**
 * Hook to get districts filtered by State
 */
export function useStateDistricts(stateName: string) {
  const all = useAllDistricts();
  if (!stateName || stateName === 'ALL') return all;
  return all.filter(d => d.district.state.toLowerCase() === stateName.toLowerCase());
}

/**
 * Force refresh a single district
 */
export function refreshDistrict(districtId: string) {
  enqueueDistrictFetch(districtId, 100);
}

/**
 * Request priority fetch for a state (e.g. when user hovers or selects state in UI)
 */
export function prioritizeStateDistricts(stateName: string) {
  for (const entry of districtCache.values()) {
    if (entry.district.state.toLowerCase() === stateName.toLowerCase()) {
      enqueueDistrictFetch(entry.district.id, 50);
    }
  }
}

/**
 * Get hourly data for a district for last N hours
 */
export function getDistrictHistory(districtId: string, hours = 24): HistoricalReading[] {
  const entry = districtCache.get(districtId);
  if (!entry || !entry.history) return [];
  return entry.history.slice(-hours);
}

/**
 * Get quick count stats for all 766 districts
 */
export function getNationalStatsSummary() {
  let total = 0;
  let healthy = 0;
  let degraded = 0;
  let critical = 0;
  let offline = 0;
  let loading = 0;

  for (const entry of districtCache.values()) {
    total++;
    switch (entry.health) {
      case 'HEALTHY':
        healthy++;
        break;
      case 'DEGRADED':
        degraded++;
        break;
      case 'CRITICAL':
        critical++;
        break;
      case 'OFFLINE':
        offline++;
        break;
      case 'LOADING':
      default:
        loading++;
        break;
    }
  }

  const live = healthy + degraded + critical;
  const coveragePercent = total > 0 ? ((live / total) * 100).toFixed(1) : '0.0';

  return {
    total,
    healthy,
    degraded,
    critical,
    offline,
    loading,
    live,
    coveragePercent
  };
}
