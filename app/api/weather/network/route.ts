import { NextResponse } from 'next/server';
import { IMD_AWS_STATIONS } from '@/lib/stationData';
import { fetchBatchLiveObservations } from '@/lib/liveWeatherService';

/**
 * Multi-station live meteorological feed across all 21 registered IMD station coordinates.
 * Uses Open-Meteo's keyless batch endpoint (QNH-reduced via station elevation).
 *
 * Provenance: PUBLIC_MODEL_API (Open-Meteo NWP surface analysis) — NOT official
 * IMD physical AWS transducer telemetry.
 */
export async function GET() {
  const observations = await fetchBatchLiveObservations(IMD_AWS_STATIONS);
  const count = Object.keys(observations).length;

  if (count === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to fetch live Open-Meteo observations for registered stations.',
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      provider: 'OPEN_METEO_PUBLIC_API',
      provenance: 'LIVE',
      statement: `Live Open-Meteo surface NWP analysis across ${count} of ${IMD_AWS_STATIONS.length} IMD station coordinates (QNH reduced). Not official IMD hardware telemetry.`,
      fetchedAt: Date.now(),
      count,
      observations,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=180',
        'CDN-Cache-Control': 'public, s-maxage=60',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
      },
    }
  );
}

