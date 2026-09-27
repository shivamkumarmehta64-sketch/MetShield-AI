import { NextResponse } from 'next/server';
import { IMD_AWS_STATIONS } from '@/lib/stationData';
import { ALL_766_DISTRICTS, IndiaDistrict } from '@/lib/india766Districts';
import { DISTRICT_REGISTRY_COUNTS } from '@/lib/dataProvenance';

/**
 * Daily quality-control sweep report.
 *
 * This endpoint previously returned a fully hardcoded report: 1350 stations,
 * 1342 active nodes, 99.82% / 99.41% pass rates, 38 validated storms, 14
 * imputations, and a "cryptographicSeal" whose signature was
 * `Buffer.from("METSHIELD_" + timestamp).toString("base64")` — i.e. base64 of
 * the request time, labelled HMAC-SHA256. Every number was invented and the
 * "signature" verified nothing.
 *
 * It now reports what can actually be derived from this repository: the real
 * size of the station registry and the real composition of the district
 * registry. QC pass-rate metrics are OMITTED rather than fabricated, because
 * there is no persisted observation archive in this build to compute them from.
 * A daily cron that invents a 99.41% national quality score is worse than one
 * that reports nothing.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Enforce Vercel Cron Secret authentication in production when configured
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing Cron Secret token.' },
        { status: 401 }
      );
    }
  }

  const timestamp = new Date().toISOString();

  // Real, derivable registry facts.
  const stationIds = new Set(IMD_AWS_STATIONS.map((s) => s.stationId));
  const districtIds = new Set(ALL_766_DISTRICTS.map((d: IndiaDistrict) => d.id));

  // 21 station profiles ship in this repo, not 1,350. Report the real number and
  // name the gap explicitly rather than inflating it.
  const MONITORED_STATION_COUNT = IMD_AWS_STATIONS.length;
  const IMD_NATIONAL_STATION_COUNT = 1350;

  const auditReport = {
    system: 'Metshield AI (NAWS-MetShield v4.2)',
    executionType: 'AUTOMATED_VERCEL_EDGE_CRON_SWEEP',
    schedule: '0 0 * * * (00:00 UTC Daily)',
    timestamp,

    dataProvenance: 'DERIVED_FROM_REPOSITORY_REGISTRIES',

    registry: {
      stationProfilesInThisBuild: MONITORED_STATION_COUNT,
      imdNationalStationCount: MONITORED_STATION_COUNT === IMD_NATIONAL_STATION_COUNT
        ? undefined
        : IMD_NATIONAL_STATION_COUNT,
      stationProfileGap:
        MONITORED_STATION_COUNT === IMD_NATIONAL_STATION_COUNT
          ? undefined
          : `This build ships ${MONITORED_STATION_COUNT} station profiles against an IMD national network of ~${IMD_NATIONAL_STATION_COUNT}. The remainder are not modelled here.`,
      uniqueStationIds: stationIds.size,
      districtRecords: districtIds.size,
      districtRegistryComposition: {
        real: DISTRICT_REGISTRY_COUNTS.real,
        attributeModified: DISTRICT_REGISTRY_COUNTS.modified,
        synthesizedPlaceholders: DISTRICT_REGISTRY_COUNTS.synthesized,
      },
    },

    /**
     * Intentionally absent. These were previously hardcoded and are not
     * computable in this build — there is no observation archive to sweep:
     *   totalActiveDCPNodes, tier1PlausibilityPassRate,
     *   tier2ThermodynamicStormsValidated, tier3SpatialConsensusQuarantined,
     *   selfHealingImputationsApplied, overallNationalQCScore
     *
     * Computing them requires persisting evaluated packets and aggregating over
     * a real window. Until that exists, these fields are omitted rather than
     * reported as a passing grade.
     */
    qcMetrics: null,
    qcMetricsNote:
      'Quality-control pass rates are not reported: this build has no persisted observation archive to aggregate over. Reporting a score here would be fabricated.',

    complianceStandardsReferenced: [
      'WMO-No. 8 Guide to Meteorological Instruments',
      'NDMA Common Alerting Protocol (CAP v1.2)',
      'NABL ISO/IEC 17025 Sensor Calibration Protocol',
    ],

    integrity: {
      /**
       * The previous "cryptographicSeal.algorithm: HMAC-SHA256" was a base64
       * encoding of the request timestamp and verified nothing.
       */
      algorithm: null,
      signature: null,
      note: 'No cryptographic signing is implemented in this build. Integrity is limited to a per-packet unkeyed FNV-1a corruption checksum (see lib/anomalyLogic.ts computeDemoIntegritySeal), which is not tamper-evident.',
    },

    status: 'REGISTRY_OK_NO_OBSERVATION_ARCHIVE',
  };

  return NextResponse.json(auditReport, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json',
    },
  });
}
