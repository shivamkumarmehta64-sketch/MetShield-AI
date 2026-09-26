import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';

import { NICWMOAnomalyEngine } from '@/lib/anomalyLogic';
import type { RootCauseClassification } from '@/lib/anomalyLogic';
import { IMD_AWS_STATIONS } from '@/lib/stationData';
import { ALL_766_DISTRICTS } from '@/lib/india766Districts';

/**
 * MetShield AI — automated QC self-consistency sweep
 * ==================================================
 * `vercel.json` fires this route at 00:00 UTC. Until now it computed nothing:
 * it returned a literal object stamped `HEALTHY_NOMINAL`, with a station count
 * 64x the size of the registry it was supposedly monitoring, pass rates derived
 * from no measurement at all, and a "HMAC-SHA256" signature that was a base64
 * encoding of the timestamp — forgeable by anyone who read the code, and
 * labelled as a cryptographic seal besides. A daily job that reports a national
 * QC score it never computed is worse than no daily job: it is a claim that
 * something is being checked when nothing is.
 *
 * ── WHAT THIS SWEEP IS ──────────────────────────────────────────────────
 * It runs the real engine — `NICWMOAnomalyEngine.processIngestedObservation`,
 * the same entry point `POST /api/telemetry` uses and the same one
 * `scripts/benchmark-qc.ts` scores — over every station in the registry, using
 * that station's own climatological baseline as input.
 *
 * ── WHAT IT IS NOT ──────────────────────────────────────────────────────
 * It is a SELF-CONSISTENCY test, and the field names below say so. The inputs
 * are baselines, not observations: no MOSDAC/DCP packet is read, so nothing
 * here is a measurement of national QC yield, of Indian data quality, or of
 * fielded hardware. A station is "nominal" here when the engine, fed the
 * station's own climatology, does not raise an anomaly — which is a statement
 * about the engine and the registry, and about nothing in the field.
 *
 * The single most misleading number this route used to publish was
 * `overallNationalQCScore`. There is no national QC score to publish: this
 * deployment monitors 21 stations in a demo registry, and the honest field for
 * a self-consistency result says exactly that. Every rate below carries the
 * population it was computed over, in a sibling field, because a rate over 21
 * stations rendered as a bare percentage invites the reader to supply a
 * denominator the number does not have.
 */

// ─── Sweep constants ──────────────────────────────────────────────────────

/** Deterministic PRNG to make the sweep reproducible (seed 20260926). */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tick spacing of the synthetic stream the engine is fed. */
const TICK_MS = 2500;
/**
 * Nominal ticks pushed before scoring. The engine's storm, spike, freeze and
 * drift rules all read a rolling window and latch over several ticks, so a
 * shorter priming run scores decisions made on a cold buffer — a property of
 * the priming length, not of the engine. This matches the warm-up the
 * benchmark harness uses so the two are comparable.
 */
const WARMUP_TICKS = 8;
/** Post-warm-up ticks actually scored per station. */
const SCORED_TICKS = 6;
/**
 * Baseline amplitude for the synthetic channel noise, in the units of each
 * channel. An exactly-repeating nominal triple is a frozen probe, and the
 * engine is right to call it one — so a "nominal" stream here has to carry
 * noise or the sweep measures the freeze detector instead of the engine.
 */
const NOISE_T = 0.35;
const NOISE_P = 0.25;
const NOISE_H = 1.2;

/**
 * The mobile node is a field smartphone / ESP32 with no station metadata —
 * its `baseline` is a coarse fallback and its sensors are read through a
 * different path (`lib/liveWeatherService.ts`). Excluding it from the sweep is
 * the same call `scripts/benchmark-qc.ts` makes, and for the same reason: its
 * registry baseline is not a climatology the engine can be held to.
 */
const SWEEP_STATIONS = IMD_AWS_STATIONS.filter((s) => s.stationId !== 'AWS-MOB-01');

/** Clamp a channel to the physical range the registry baselines live in. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** A rate as a percentage string, plus the population it was computed over. */
function rateOf(part: number, whole: number): { rate: string; over: number; of: number } {
  return {
    rate: whole === 0 ? 'n/a' : `${((part / whole) * 100).toFixed(1)}%`,
    over: whole,
    of: part,
  };
}

type SweepOutcome = 'SWEEP_INCONCLUSIVE' | 'DEGRADED' | 'HEALTHY_NOMINAL';

interface EngineVerdictCounts {
  [key: string]: number;
}

/**
 * The seal on this report.
 *
 * The previous version shipped `Buffer.from('METSHIELD_<timestamp>').toString('base64')`
 * under the label `algorithm: 'HMAC-SHA256'`. That is an encoding, not a
 * message authentication code: anyone reading the source could reproduce it,
 * so it attested to nothing at all while claiming to attest to integrity.
 *
 * The `algorithm` field below is now derived from the value, not asserted
 * beside it — `HMAC-SHA256` appears only when a real key was configured, and
 * the honest `NOT_A_SIGNATURE` label is emitted otherwise. The three
 * `signed*` fields are the only ones that say the report is signed. A deployment
 * that has not set a secret renders `signature: null` and a report that claims
 * no signature, which is the correct thing for an unauthenticated endpoint to
 * claim; it does not fall back to a plausible-looking seal.
 */
function sealReport(body: string, timestamp: string): {
  algorithm: 'HMAC-SHA256' | 'NOT_A_SIGNATURE';
  keyConfigured: boolean;
  signedAt: string;
  digestAlgorithm: string;
  digest: string;
  signature: string | null;
  note: string;
} {
  const digest = createHmac('sha256', 'metshield-audit-digest-v1').update(body).digest('hex');
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return {
      algorithm: 'NOT_A_SIGNATURE',
      keyConfigured: false,
      signedAt: timestamp,
      digestAlgorithm: 'HMAC-SHA256',
      digest,
      signature: null,
      note:
        'No signing key is configured (CRON_SECRET is unset), so this report is UNSIGNED. ' +
        'The digest above covers the report body under a fixed public key and is an integrity ' +
        'checksum, not a signature: it proves the body has not changed since it was written, ' +
        'and proves nothing about who wrote it. Set CRON_SECRET to sign this report with a key ' +
        'the client never sees.',
    };
  }

  return {
    algorithm: 'HMAC-SHA256',
    keyConfigured: true,
    signedAt: timestamp,
    digestAlgorithm: 'HMAC-SHA256',
    digest,
    signature: createHmac('sha256', secret).update(body).digest('hex'),
    note:
      'Signed with HMAC-SHA256 over the canonical report body using the server-side CRON_SECRET. ' +
      'Verify before trusting: recompute HMAC-SHA256(key, body) and compare.',
  };
}

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

  // ─── Run the sweep ──────────────────────────────────────────────────────
  // Wrapped in a try/catch because every claim below is a claim about a sweep
  // that actually ran. `lib/benchmarkResults.ts` throws at module load if the
  // benchmark artifact is missing, and a station could be absent from the
  // registry. If the sweep cannot complete, the report says so and reports a
  // failing status — it does not fall through to a default-healthy report with
  // last-known numbers in it, which is the failure mode this route is being
  // fixed for.
  let report: Record<string, unknown> & { status: SweepOutcome };

  try {
    // A private engine, not the module-level `nicWmoEngineInstance` that
    // `POST /api/telemetry` mutates. Two requests sharing one engine's rolling
    // buffers would have each station's "first" tick judged against whichever
    // request arrived first, and the resulting counts would depend on
    // concurrency. Each sweep starts from a known-cold engine.
    const engine = new NICWMOAnomalyEngine();

    // Fixed epoch, not `Date.now()`. The engine takes the tick timestamp as an
    // input, so the sweep is fully reproducible: re-running it on any day
    // classifies exactly the same stream and returns exactly the same counts.
    // A report whose numbers move because the wall clock moved is a report
    // nobody can check.
    const BASE_TS = 1773220800000; // 2026-03-12T14:40:00Z — SEEDED_BASE_EPOCH in lib/anomalyLogic
    const ticks = WARMUP_TICKS + SCORED_TICKS;
    const rnd = mulberry32(20260926);

    const stationsSwept: string[] = [];
    const stationsWithAnomaly: string[] = [];
    const stationsFailing: string[] = [];
    const errors: { stationId: string; message: string }[] = [];
    const verdictCounts: EngineVerdictCounts = {};
    let ticksProcessed = 0;

    for (const station of SWEEP_STATIONS) {
      // A fresh buffer per station, so no station's history leaks into the
      // next one's first decisions.
      engine.resetToNominal(station.stationId);

      let t = station.baseline.tempMean;
      let p = station.baseline.pressureMean;
      let h = station.baseline.humidityMean;
      let lastVerdict: RootCauseClassification | null = null;

      for (let i = 0; i < ticks; i++) {
        // Per-tick noise around the station's own climatology. This is the
        // input stream, not a measurement — the whole scope of the sweep.
        const obsT = Math.round(clamp(t + (rnd() - 0.5) * 2 * NOISE_T, -10, 55) * 100) / 100;
        const obsP = Math.round(clamp(p + (rnd() - 0.5) * 2 * NOISE_P, 920, 1050) * 10) / 10;
        const obsH = Math.round(clamp(h + (rnd() - 0.5) * 2 * NOISE_H, 5, 100) * 10) / 10;

        const pkt = engine.processIngestedObservation(
          station.stationId,
          obsT,
          obsP,
          obsH,
          BASE_TS + i * TICK_MS
        );
        ticksProcessed++;

        if (i >= WARMUP_TICKS) {
          lastVerdict = pkt.classification;
          verdictCounts[pkt.classification] = (verdictCounts[pkt.classification] ?? 0) + 1;
        }

        t = obsT;
        p = obsP;
        h = obsH;
      }

      stationsSwept.push(station.stationId);
      if (lastVerdict === null) {
        // Unreachable with SCORED_TICKS > 0, and if it ever becomes reachable
        // it means the scored window was empty — which is a sweep failure, not
        // a healthy station.
        stationsFailing.push(station.stationId);
        errors.push({ stationId: station.stationId, message: 'No verdict produced in the scored window.' });
      } else if (lastVerdict !== 'NOMINAL_OPERATION') {
        stationsWithAnomaly.push(station.stationId);
      }
    }

    const swept = stationsSwept.length;
    const expected = SWEEP_STATIONS.length;
    const passed = swept - stationsWithAnomaly.length - stationsFailing.length;
    const nominalRate = rateOf(passed, swept);

    // `status` is derived, never asserted. Three outcomes and no fourth:
    // the sweep could not run, at least one station raised an anomaly, or
    // every station the engine scored came back nominal. A constant healthy
    // status is what this route used to do, and it was the load-bearing lie —
    // every other number in the old report was decoration on top of it.
    const status: SweepOutcome =
      errors.length > 0 || swept !== expected
        ? 'SWEEP_INCONCLUSIVE'
        : stationsWithAnomaly.length > 0
          ? 'DEGRADED'
          : 'HEALTHY_NOMINAL';

    // The measured registry figures. Previously `monitoredStations: 1350` and
    // `totalActiveDCPNodes: 1342` — a network 64x the size of the registry in
    // `lib/stationData.ts`, and a DCP node count for a network that does not
    // exist. Both are now counted from the arrays they claim to describe.
    const reportBody: Record<string, unknown> & { status: SweepOutcome } = {
      system: 'Metshield AI (NAWS-MetShield v4.2)',
      executionType: 'AUTOMATED_VERCEL_EDGE_CRON_SWEEP',
      schedule: '0 0 * * * (00:00 UTC Daily)',
      timestamp,

      sweep: {
        kind: 'ENGINE_SELF_CONSISTENCY',
        inputSource:
          'Each station\'s own climatological baseline from lib/stationData.ts, plus per-tick ' +
          'sensor noise. NO live IMD / MOSDAC / DCP packet is read by this route.',
        ingestPath: 'NICWMOAnomalyEngine.processIngestedObservation — the same entry point POST /api/telemetry uses',
        whatItMeasures:
          'Whether the engine, fed each station\'s own climatology, classifies it as nominal. ' +
          'This is a self-consistency check on the engine and the registry.',
        whatItDoesNotMeasure:
          'It is NOT a measurement of national QC yield, of Indian station data quality, or of ' +
          'fielded hardware. No observation from any real station passes through this route, so no ' +
          'rate below is a national figure and none of them is a field performance claim. The ' +
          'accuracy and latency figures under `benchmark` are the only measured performance ' +
          'numbers in this report, and they are measured on a synthetic suite, not in the field.',
        warmupTicksPerStation: WARMUP_TICKS,
        scoredTicksPerStation: SCORED_TICKS,
        tickIntervalMs: TICK_MS,
        inputEpoch: BASE_TS,
        reproducible:
          'The tick timestamps are fixed and the injected noise uses a seeded PRNG ' +
          '(mulberry32, seed 20260926). The stream is identical on every run, so ' +
          're-running the sweep reproduces these exact counts and verdicts. The seeded, ' +
          'fully reproducible measurement of this engine is `npm run bench:qc`.',
      },

      scope: {
        districtsCovered: ALL_766_DISTRICTS.length,
        districtsInRegistry: 'ALL_766_DISTRICTS entries, none of which is a real live telemetry source in this deployment.',
        stationsInRegistry: IMD_AWS_STATIONS.length,
        stationsSwept: swept,
        stationsExcluded: IMD_AWS_STATIONS
          .filter((s) => !SWEEP_STATIONS.some((w) => w.stationId === s.stationId))
          .map((s) => ({
            stationId: s.stationId,
            reason:
              'Field smartphone / ESP32 node: no station climatology in the registry and a ' +
              'different sensor path, so it has no baseline this sweep could hold the engine to.',
          })),
        // A rate over 21 stations is not a national rate, so the denominators
        // travel with the number.
        selfConsistencyNominalRate: nominalRate.rate,
        stationsFlaggedAnomalous: stationsWithAnomaly.length,
      },

      // ── The measured performance figures, and only these ───────────────
      // Loaded through a dynamic import for one reason: `lib/benchmarkResults.ts`
      // validates at module load and throws if the artifact is missing, and a
      // static import would take this route down with it. It is caught and
      // reported below rather than defaulted — see the brief. These are
      // benchmark results on a synthetic suite, not this deployment's
      // operational metrics.
      benchmark: await (async () => {
        const b = await import('@/lib/benchmarkResults');
        return {
          source: 'data/benchmark-results.json, written by `npm run bench:qc`',
          measuredAt: b.bench.generatedAt,
          label: b.SYNTHETIC_SUITE_LABEL,
          accuracy: b.accuracy,
          macroF1: b.macroF1,
          stormVsFaultAccuracy: b.stormVsFault.accuracy,
          scenarioCount: b.bench.scenarioCount,
          /**
           * `latencyPerTickMs.p95`, named as such. `latencyMs` has two scopes
           * (`perTick`, `perScenario`) and a flattened `latencyMs.p95` reads
           * unambiguously at the call site, which is exactly where picking the
           * wrong scope goes unnoticed — and the per-scenario figure is ~14x
           * this one. p95 over `max`: in a short Node run the maximum is
           * scheduler and GC noise, not engine work.
           */
          latencyPerTickMs_p95: b.latencyPerTickMs.p95,
          latencyStatistic: 'p95 (95th percentile) over per-tick classify calls',
          runtime: b.benchmarkConditions.runtime,
          note: b.benchmarkConditions.note,
        };
      })(),

      results: {
        stationsSwept: swept,
        stationsExpected: expected,
        stationsClassifiedNominal: passed,
        stationsFlaggedAnomalous: stationsWithAnomaly.length,
        stationsFailing: stationsFailing.length,
        flaggedStationIds: stationsWithAnomaly,
        // Engine verdicts, counted. Every classification the engine emitted
        // across the scored window, so the nominal rate above is checkable
        // against them rather than taken on trust.
        engineVerdictCounts: verdictCounts,
        totalPacketsClassified: ticksProcessed,
        errors,
      },

      complianceStandards: [
        'WMO-No. 8 Guide to Meteorological Instruments',
        'NDMA Common Alerting Protocol (CAP v1.2)',
        'NABL ISO/IEC 17025 Sensor Calibration Protocol',
      ],
      // A list of the documents the QC logic is written against, stated as
      // such. The old report carried this list in the same shape as a set of
      // measured rates, which read as though conformity had been certified. The
      // engine applies WMO flag definitions and CAP alert levels; it is not a
      // NABL-accredited calibration laboratory and this route certifies nothing.
      complianceStandardsBasis:
        'The QC logic is written against these documents (WMO flag definitions, CAP alert levels). ' +
        'This route performs no certification, accreditation or audit against them, and issuing this ' +
        'report does not demonstrate conformity with any of them.',

      status,
    };

    report = { ...reportBody, cryptographicSeal: sealReport(JSON.stringify(reportBody), timestamp) };
  } catch (err) {
    // The sweep did not run, so there is nothing to report a rate over. Say
    // that in as many words, with the failure attached.
    report = {
      system: 'Metshield AI (NAWS-MetShield v4.2)',
      executionType: 'AUTOMATED_VERCEL_EDGE_CRON_SWEEP',
      schedule: '0 0 * * * (00:00 UTC Daily)',
      timestamp,
      sweep: {
        kind: 'ENGINE_SELF_CONSISTENCY',
        inputSource: 'Station climatological baselines from lib/stationData.ts. No live telemetry is read.',
        ingestPath: 'NICWMOAnomalyEngine.processIngestedObservation',
      },
      results: {
        stationsSwept: 0,
        stationsExpected: SWEEP_STATIONS.length,
        stationsClassifiedNominal: 0,
        stationsFlaggedAnomalous: 0,
        stationsFailing: 0,
        flaggedStationIds: [],
        engineVerdictCounts: {},
        totalPacketsClassified: 0,
        errors: [
          {
            stationId: '*',
            message: err instanceof Error ? err.message : 'The sweep failed for an unknown reason.',
          },
        ],
      },
      status: 'SWEEP_INCONCLUSIVE' as SweepOutcome,
      sweepFailed: true,
      // A failed sweep is reported as a failure. It is not reported with the
      // previous run's numbers, and it is not reported as healthy.
      cryptographicSeal: sealReport(
        JSON.stringify({ timestamp, sweepFailed: true }),
        timestamp
      ),
    };
  }

  return NextResponse.json(report, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json',
    },
  });
}
