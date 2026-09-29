import { NextRequest, NextResponse } from 'next/server';

import { nicWmoEngineInstance, TelemetryPacket } from '@/lib/anomalyLogic';
import { IMD_AWS_STATIONS, getStationProfile } from '@/lib/stationData';
import { fetchLiveStationObservation } from '@/lib/liveWeatherService';
import { persistTelemetryToEdge, resolveWorkOrderOnEdge } from '@/lib/d1Adapter';
import { authorizeWrite, type AuthResult } from '@/lib/auth';
import { consume } from '@/lib/rateLimit';

// In-memory ring buffer for live ingested telemetry from mobile phones / ESP32
const liveIngestedBuffer: TelemetryPacket[] = [];

/** Stations post every 2.5 s, so this leaves ample headroom above the real cadence. */
const MAX_PACKETS_PER_MINUTE = 240;

/** Both AI-adjacent routes and the write path share one limiter implementation. */
const RATE_WINDOW_MS = 60_000;

/**
 * Render an authorisation failure.
 *
 * `reason` is a stable machine-readable code; `remediation` is written for the
 * operator holding the device. Neither reveals whether a different key would
 * have worked, so the message cannot be used as an oracle.
 */
function authErrorResponse(result: Extract<AuthResult, { ok: false }>) {
  return NextResponse.json(
    {
      success: false,
      error: 'Telemetry write refused.',
      reason: result.reason,
      remediation: result.remediation,
    },
    { status: result.status }
  );
}

/**
 * Metshield AI: Automated Weather Station Quality Management System
 * Metshield-QMS Real-Time Telemetry Ingestion API
 * Provides high-throughput validation of 3 primary parameters:
 * - Temperature (°C)
 * - Atmospheric Pressure (hPa)
 * - Relative Humidity (%)
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  // 1. Content Length Check (< 15 KB)
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 15360) {
    return NextResponse.json(
      {
        success: false,
        error: 'Payload Too Large. Maximum allowed size is 15 KB.',
      },
      { status: 413 }
    );
  }

  try {
    const body = await request.json();
    const {
      stationId,
      temperature,
      pressure,
      humidity,
      windSpeed,
      windDirection,
      rainfall,
      solarRadiation,
      batteryVoltage,
      timestamp,
      lat,
      lon,
      deviceName,
      sensorSource,
    } = body;

    if (!stationId || typeof stationId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid parameter: stationId (e.g. "AWS-MOB-01" or "AWS-DEL-04")',
        },
        { status: 400 }
      );
    }

    // Rate limiting keyed by stationId or clientIp
    const rateLimitKey = `${stationId}_${clientIp}`;
    const verdict = consume(rateLimitKey, MAX_PACKETS_PER_MINUTE, RATE_WINDOW_MS);
    if (!verdict.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Maximum ${MAX_PACKETS_PER_MINUTE} packets per minute allowed.`,
        },
        { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } }
      );
    }

    // Flexible Station ID format supporting mobile nodes, districts, and legacy IMD nodes
    const stationIdRegex = /^AWS-[A-Za-z0-9_-]{2,24}$/;
    if (!stationIdRegex.test(stationId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Malformed station ID format. Expected format: AWS-XXX-99 or AWS-MOB-XX',
        },
        { status: 400 }
      );
    }

    // ─── Field Calibration (OTA) ───
    //
    // This branch rewrites a station's barometric register, which is the
    // baseline every later QC verdict for that station is computed against, so
    // it carries the stronger of the two scopes. `technicianId` is NOT
    // consulted for authorisation and never was — it is a free-text field in
    // the body, which means anyone can put any name in it. The decision rests
    // entirely on the station's provisioned credential.
    if (body.action === 'CALIBRATE_OFFSET') {
      const calibrationAuth = authorizeWrite(request.headers, stationId, 'calibration');
      if (!calibrationAuth.ok) return authErrorResponse(calibrationAuth);

      const pOffset = typeof body.pressureOffset === 'number' ? body.pressureOffset : 0;
      const tOffset = typeof body.temperatureOffset === 'number' ? body.temperatureOffset : 0;
      const techId = typeof body.technicianId === 'string' ? body.technicianId : 'FIELD-TECH-IMD';
      const ticketId = typeof body.ticketId === 'string' ? body.ticketId : null;

      const calib = nicWmoEngineInstance.applyFieldCalibration(stationId, pOffset, tOffset);
      if (ticketId) {
        await resolveWorkOrderOnEdge(ticketId, `Calibrated by ${techId}: Offset ${pOffset} hPa committed.`);
      }

      return NextResponse.json({
        success: true,
        action: 'CALIBRATE_OFFSET',
        stationId,
        ticketId,
        technicianId: techId,
        newDriftOffset: calib.newDriftOffset,
        message: calib.message,
        compliance: 'WMO-No. 8 Calibration Traceability Standard',
        timestamp: Date.now(),
      });
    }

    // ─── Observation ingestion ───
    //
    // Everything above this line is unauthenticated request parsing. From here
    // on the caller is writing into the QC engine's state, so a valid station
    // credential is required. Without this check, anyone able to reach the URL
    // could inject readings for any registered station and steer its drift and
    // fault verdicts — the injection would be indistinguishable from a genuine
    // sensor failure to every downstream consumer.
    const writeAuth = authorizeWrite(request.headers, stationId, 'telemetry');
    if (!writeAuth.ok) return authErrorResponse(writeAuth);


    // Parse & sanitize numeric values (allowing null for dropped packets)
    const parseParam = (val: unknown, min: number, max: number): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      if (isNaN(num) || !isFinite(num)) return null;
      // Clamp or reject unphysical inputs beyond absolute planetary bounds
      if (num < min || num > max) return null;
      return Math.round(num * 100) / 100;
    };

    const rawTemp = parseParam(temperature, -90, 70);
    const rawPress = parseParam(pressure, 600, 1100);
    const rawHum = parseParam(humidity, 0, 100);
    const rawWind = parseParam(windSpeed, 0, 250);
    const rawWindDir = parseParam(windDirection, 0, 360);
    const rawRain = parseParam(rainfall, 0, 300);

    const safeTimestamp = (typeof timestamp === 'number' && timestamp > 0 && timestamp < Date.now() + 86400000)
      ? timestamp
      : Date.now();

    // Ingest & evaluate through WMO Pub No. 8 Quality Control Pipeline
    const evaluatedPacket: TelemetryPacket = nicWmoEngineInstance.processIngestedObservation(
      stationId,
      rawTemp,
      rawPress,
      rawHum,
      safeTimestamp,
      rawWind,
      rawWindDir,
      rawRain
    );

    // Attach mobile hardware GPS, device metadata, solar, and battery metrics if provided
    (evaluatedPacket as unknown as {
      mobileMetadata?: {
        lat?: number;
        lon?: number;
        deviceName?: string;
        solarRadiation?: number;
        batteryVoltage?: number;
        sensorSource?: string;
      };
    }).mobileMetadata = {
      lat: typeof lat === 'number' && !isNaN(lat) ? lat : undefined,
      lon: typeof lon === 'number' && !isNaN(lon) ? lon : undefined,
      deviceName: typeof deviceName === 'string' ? deviceName : 'Field Smartphone Sensor',
      solarRadiation: typeof solarRadiation === 'number' && !isNaN(solarRadiation) ? solarRadiation : undefined,
      batteryVoltage: typeof batteryVoltage === 'number' && !isNaN(batteryVoltage) ? batteryVoltage : undefined,
      sensorSource: typeof sensorSource === 'string' ? sensorSource : undefined,
    };

    // Save into live ingestion ring buffer for real-time mobile sync
    liveIngestedBuffer.unshift(evaluatedPacket);
    if (liveIngestedBuffer.length > 50) {
      liveIngestedBuffer.pop();
    }

    // Asynchronous persistence to Cloudflare D1, with an in-memory fallback.
    //
    // This previously used `.catch(() => {})`, which discarded both the failure
    // and the result. Combined with persistTelemetryToEdge returning
    // `persisted: true` on fallback, a total storage failure was completely
    // invisible: the client got 200, the UI showed the packet, and nothing was
    // durably written. Now the degradation is logged and reported in the
    // response so an operator can see that the audit trail is not durable.
    const storageResult = await persistTelemetryToEdge(evaluatedPacket);
    if (!storageResult.persisted) {
      console.warn(
        `[telemetry] Durable storage unavailable for packet ${evaluatedPacket.packetId} ` +
          `(station ${evaluatedPacket.stationId}). Held in a process-local buffer only; ` +
          `it will be lost on restart. Check the D1 binding.`
      );
    }

    const latencyMs = Math.round((performance.now() - startTime) * 10) / 10;

    return NextResponse.json(
      {
        success: true,
        requestLatencyMs: latencyMs,
        compliance: 'WMO Pub No. 8 Quality Management Standards',
        /**
         * Whether this packet reached durable storage. `false` means it is
         * held in a volatile buffer and will not survive a restart — callers
         * building an audit trail must treat that as a failed write.
         */
        persisted: storageResult.persisted,
        storage: storageResult.storage,
        data: evaluatedPacket,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON payload structure.',
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get('stationId');
  const isLive = searchParams.get('live') === 'true';
  const isLatest = searchParams.get('latest') === 'true';
  const since = Number(searchParams.get('since') || 0);

  // Return live ingested packets from mobile phones or external transmitters
  if (isLatest) {
    const filtered = since > 0
      ? liveIngestedBuffer.filter((p) => p.timestamp > since)
      : liveIngestedBuffer.slice(0, 10);

    return NextResponse.json(
      {
        success: true,
        count: filtered.length,
        packets: filtered,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5',
          'CDN-Cache-Control': 'public, s-maxage=2',
        },
      }
    );
  }

  // If live query requested for a specific station, fetch from Open-Meteo public API
  if (isLive && stationId) {
    const station = getStationProfile(stationId);
    if (station) {
      const liveData = await fetchLiveStationObservation(station);
      if (liveData) {
        return NextResponse.json(
          {
            success: true,
            stationId: station.stationId,
            name: station.name,
            coordinates: { latitude: station.latitude, longitude: station.longitude },
            liveObservation: liveData,
            source: 'Open-Meteo Free Public Meteorological API',
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
              'CDN-Cache-Control': 'public, s-maxage=15',
              'Vercel-CDN-Cache-Control': 'public, s-maxage=15',
            },
          }
        );
      }
    }
  }

  const stations = IMD_AWS_STATIONS.map((s) => ({
    stationId: s.stationId,
    name: s.name,
    state: s.state,
    coordinates: { lat: s.latitude, lon: s.longitude },
    elevationM: s.elevationM,
    status: s.status || 'OPERATIONAL',
  }));

  return NextResponse.json(
    {
      system: 'Metshield AI: Automated Weather Station Quality Management System (AWS-QMS)',
      version: '4.2.8',
      compliance: 'WMO Pub No. 8 & CIMO Standards',
      liveDataSource: 'Open-Meteo Free Public Satellite & Surface API',
      qualityFlags: {
        FLAG_1_VERIFIED_GOOD: 'Observation nominal, within step limits and verified for NWP ingestion.',
        FLAG_2_CONVECTIVE_STORM: 'Severe convective front (pressure drop + humidity surge). Validated for NWP.',
        FLAG_3_SUSPECT_DRIFT: 'Barometer gradual monotonic calibration drift.',
        FLAG_4_CORRUPT_HARDWARE: 'Thermistor open circuit spike or stuck ADC register freeze. Quarantined.',
        FLAG_5_PACKET_LOSS: 'Missing frames or corrupted payload. Reconstructed from historical baseline.',
      },
      totalMonitoredStations: stations.length,
      stations,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=60',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
      },
    }
  );
}

