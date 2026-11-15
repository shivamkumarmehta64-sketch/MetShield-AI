/**
 * MetShield AI — Real-Record, Anomaly-Injected Benchmark
 * ======================================================
 * The SIH26073 evaluation criterion is "to be evaluated in anomaly injected data".
 * `benchmark-detector.ts` injects faults into a synthetic sinusoid. This harness
 * injects them into RECORDED station observations, so the detector is scored on
 * atmospheric sequences it did not generate.
 *
 * DATA
 * ----
 * `scripts/fetch-real-aws-data.mjs` downloads hourly dry-bulb temperature, relative
 * humidity and station pressure from Meteostat's bulk hourly archive, which is
 * assembled from ISD/GHCN station reports. Each record drives the REGISTERED IMD
 * profile at the same coordinates — Safdarjung (42182) is AWS-DEL-04, Colaba (43057)
 * is AWS-MUM-01, and so on — so the station baselines the engine reads are the ones
 * belonging to the place the observations came from.
 *
 * HONESTY RULES FOR THIS HARNESS
 * ------------------------------
 *  - Fault magnitudes are SAMPLED from documented ranges with a seeded PRNG. None is
 *    tuned to the engine's thresholds.
 *  - The naive range-check QC is scored on the same injected rows, so "the engine
 *    beats a static filter" is measured rather than asserted.
 *  - Clean rows are scored separately. A detector that catches every fault by
 *    quarantining real weather is worse than useless to a meteorological service,
 *    so the clean-row false-alarm rate and the extreme-value pass-through rate are
 *    reported alongside the F1.
 *  - Whatever comes out is printed. No result in this file is hand-written.
 *
 * Run:  npm run bench:real
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NICWMOAnomalyEngine } from '../lib/anomalyLogic';
import type { RootCauseClassification } from '../lib/anomalyLogic';

// ─── Deterministic PRNG (mulberry32): every run is byte-identical ─────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260201;
const rand = mulberry32(SEED);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);

/** Recorded series → the registered IMD profile at identical coordinates. */
const STATIONS: Array<{ wmo: string; stationId: string; name: string }> = [
  { wmo: '42182', stationId: 'AWS-DEL-04', name: 'Safdarjung, New Delhi' },
  { wmo: '43057', stationId: 'AWS-MUM-01', name: 'Colaba, Mumbai' },
  { wmo: '43279', stationId: 'AWS-CHN-03', name: 'Meenambakkam, Chennai' },
  { wmo: '42807', stationId: 'AWS-KOL-02', name: 'Alipore, Kolkata' },
  { wmo: '43371', stationId: 'AWS-TRV-15', name: 'Thiruvananthapuram' },
];

/** One observation triple. `null` is a genuine gap in the record, kept as such. */
interface Row {
  ts: number;
  temp: number | null;
  rh: number | null;
  pres: number | null;
}

type FaultClass =
  | 'FROZEN_VALUE'
  | 'SENSOR_SPIKE'
  | 'CALIBRATION_DRIFT'
  | 'TELEMETRY_PACKET_LOSS';

/** Rows per episode. 720 h = 30 days, long enough for a 72 h drift to complete. */
const EPISODE_HOURS = 720;

/** Fault catalogue. Magnitudes are ranges because real instruments fail across a range. */
const DURATION: Record<FaultClass, [number, number]> = {
  FROZEN_VALUE: [6, 18],
  // A spike is a single corrupted sample, which is what the problem statement
  // lists separately from a frozen value. Multi-hour jitter is a different fault.
  SENSOR_SPIKE: [1, 1],
  // 6–24 h so the sampled rate spans roughly 0.08–1.7 hPa/h. The engine's own
  // action text quotes a −0.4 hPa/h tolerance, so a test that never crosses it
  // would not be testing the claim.
  CALIBRATION_DRIFT: [6, 24],
  TELEMETRY_PACKET_LOSS: [1, 6],
};

const FAULT_CLASSES = Object.keys(DURATION) as FaultClass[];

/**
 * Meteostat bulk hourly v2, no header row:
 *   date, hour, temp, dwpt, rh, prcp, snow, wdir, wspd, wpgt, pres, tsun, coco
 * Only three of those columns are in scope for this problem statement.
 */
function loadSeries(wmo: string): Row[] {
  const path = join('data', 'real', `${wmo}.csv`);
  if (!existsSync(path)) {
    throw new Error(`Missing ${path} — run: node scripts/fetch-real-aws-data.mjs`);
  }
  const out: Row[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line || line.startsWith('date')) continue;
    const c = line.split(',');
    if (c.length < 11) continue;
    const [date, hour, t, , rh, , , , , , pres] = c;
    const ts = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
    if (!Number.isFinite(ts)) continue;
    const num = (v: string) => (v === '' || v === undefined ? null : Number(v));
    const temp = num(t);
    const rel = num(rh);
    const p = num(pres);
    // A row is usable only when all three in-scope parameters are present: the
    // detector is a three-parameter engine, and inventing a missing one would be
    // exactly the substitution its own rules forbid.
    if (temp === null || rel === null || p === null) continue;
    if (!Number.isFinite(temp) || !Number.isFinite(rel) || !Number.isFinite(p)) continue;
    out.push({ ts, temp, rh: rel, pres: p });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

/** Contiguous 30-day blocks. Gaps are dropped rather than interpolated. */
function episodes(rows: Row[]): Row[][] {
  const step = 3600_000;
  const blocks: Row[][] = [];
  let cur: Row[] = [];
  for (let i = 0; i < rows.length; i++) {
    cur.push(rows[i]);
    const next = rows[i + 1];
    const broken = !next || next.ts - rows[i].ts !== step;
    if (broken || cur.length === EPISODE_HOURS) {
      if (cur.length === EPISODE_HOURS) blocks.push(cur);
      cur = [];
    }
  }
  return blocks;
}

interface InjectedRow extends Row {
  truth: 'CLEAN' | FaultClass;
  /** For CALIBRATION_DRIFT only: the rate the fault was injected at, hPa/hour. */
  driftRate?: number;
}

/**
 * Apply one sampled fault to one episode.
 * The fault is written into a copy; clean rows carry `truth: 'CLEAN'`.
 */
function inject(clean: Row[], fault: FaultClass): InjectedRow[] {
  const rows: InjectedRow[] = clean.map((r) => ({ ...r, truth: 'CLEAN' }));
  const [minDur, maxDur] = DURATION[fault];
  const dur = Math.max(1, Math.round(between(minDur, maxDur)));
  const start = Math.floor(between(0, rows.length - dur - 1));

  if (fault === 'FROZEN_VALUE') {
    // Stuck reading: the value at the start of the fault is held.
    const held = rows[start].temp;
    for (let i = start; i < start + dur; i++) {
      rows[i].temp = held;
      rows[i].truth = fault;
    }
    return rows;
  }

  if (fault === 'SENSOR_SPIKE') {
    // Each corrupted sample is displaced independently. Holding one offset across
    // several hours would only be detectable at the two edges of the window, which
    // measures the injection rather than the detector.
    const sign = rand() < 0.5 ? -1 : 1;
    for (let i = start; i < start + dur; i++) {
      const base = rows[i].temp;
      const magnitude = between(8, 20);
      rows[i].temp = base === null ? null : base + sign * magnitude;
      rows[i].truth = fault;
    }
    return rows;
  }

  if (fault === 'CALIBRATION_DRIFT') {
    // Barometer offset ramped linearly to a sampled total error of 2–6 hPa.
    const sign = rand() < 0.5 ? -1 : 1;
    const total = between(2, 6);    for (let i = start; i < start + dur; i++) {
      const base = rows[i].pres;
      const progress = (i - start) / dur;
      rows[i].pres = base === null ? null : base + sign * total * progress;
      rows[i].truth = fault;
      rows[i].driftRate = total / dur;
    }
    return rows;
  }

  // TELEMETRY_PACKET_LOSS: the uplink drops, so the packet carries no values.
  for (let i = start; i < start + dur; i++) {
    rows[i].temp = null;
    rows[i].rh = null;
    rows[i].pres = null;
    rows[i].truth = fault;
  }
  return rows;
}

/** Static WMO-plausible-range QC: the baseline a threshold filter provides. */
const LIMITS = { temp: [-10, 55], rh: [0, 100], pres: [870, 1084] } as const;

function naiveFault(r: Row): boolean {
  if (r.temp === null || r.rh === null || r.pres === null) return true;
  if (r.temp < LIMITS.temp[0] || r.temp > LIMITS.temp[1]) return true;
  if (r.rh < LIMITS.rh[0] || r.rh > LIMITS.rh[1]) return true;
  if (r.pres < LIMITS.pres[0] || r.pres > LIMITS.pres[1]) return true;
  return false;
}

const FAULT_VERDICTS: ReadonlySet<RootCauseClassification> = new Set([
  'SENSOR_SPIKE',
  'FROZEN_VALUE',
  'CALIBRATION_DRIFT',
  'TELEMETRY_PACKET_LOSS',
]);

interface Tally {
  tp: number;
  fp: number;
  fn: number;
}

const emptyTally = (): Tally => ({ tp: 0, fp: 0, fn: 0 });

function score(t: Tally) {
  const precision = t.tp + t.fp === 0 ? 0 : t.tp / (t.tp + t.fp);
  const recall = t.tp + t.fn === 0 ? 0 : t.tp / (t.tp + t.fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

interface StationResult {
  wmo: string;
  stationId: string;
  name: string;
  episodes: number;
  rows: number;
  engine: Record<FaultClass, Tally>;
  naive: Record<FaultClass, Tally>;
  clean: { rows: number; engineFlags: number; naiveFlags: number; extremes: number; extremesFlagged: number };
  rootCauseHits: number;
  rootCauseTotal: number;
  driftBands: Record<string, Tally>;
  /** Verdict distribution per injected fault class, so a miss is explained not just counted. */
  verdicts: Record<string, Record<string, number>>;
}

/** Drift is reported by rate, because "detected drift" is meaningless without it. */
const DRIFT_BANDS = ['<=0.10 hPa/h', '0.10-0.25 hPa/h', '>0.25 hPa/h'] as const;

function driftBand(rate: number): (typeof DRIFT_BANDS)[number] {
  if (rate <= 0.1) return DRIFT_BANDS[0];
  if (rate <= 0.25) return DRIFT_BANDS[1];
  return DRIFT_BANDS[2];
}

function runStation(s: (typeof STATIONS)[number]): StationResult | null {
  const series = loadSeries(s.wmo);
  const blocks = episodes(series);
  if (blocks.length === 0) {
    console.warn(`  ${s.wmo} ${s.name}: no complete ${EPISODE_HOURS} h blocks — skipped`);
    return null;
  }

  // One fresh engine per station: buffers must not leak across records.
  const engine = new NICWMOAnomalyEngine();

  const res: StationResult = {
    wmo: s.wmo,
    stationId: s.stationId,
    name: s.name,
    episodes: blocks.length,
    rows: 0,
    driftBands: Object.fromEntries(DRIFT_BANDS.map((b) => [b, emptyTally()])) as Record<string, Tally>,
    verdicts: Object.fromEntries(FAULT_CLASSES.map((f) => [f, {} as Record<string, number>])),
    engine: Object.fromEntries(FAULT_CLASSES.map((f) => [f, emptyTally()])) as Record<FaultClass, Tally>,
    naive: Object.fromEntries(FAULT_CLASSES.map((f) => [f, emptyTally()])) as Record<FaultClass, Tally>,
    clean: { rows: 0, engineFlags: 0, naiveFlags: 0, extremes: 0, extremesFlagged: 0 },
    rootCauseHits: 0,
    rootCauseTotal: 0,
  };

  // 95th percentile of observed temperature in the clean record: the pool of
  // genuinely hot hours a detector must not quarantine.
  const temps = series.map((r) => r.temp).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const p95 = temps[Math.floor(temps.length * 0.95)] ?? Infinity;

  blocks.forEach((block, idx) => {
    const fault = FAULT_CLASSES[idx % FAULT_CLASSES.length];
    const rows = inject(block, fault);
    res.rows += rows.length;

    for (const r of rows) {
      const pkt = engine.processIngestedObservation(
        s.stationId,
        r.temp,
        r.pres,
        r.rh,
        r.ts
      );
      const engineSaysFault = FAULT_VERDICTS.has(pkt.classification);
      const naiveSaysFault = naiveFault(r);
      const isFault = r.truth !== 'CLEAN';

      if (isFault) {
        const cls = r.truth as FaultClass;
        bump(res.engine[cls], engineSaysFault);
        const bucket = res.verdicts[cls];
        bucket[pkt.classification] = (bucket[pkt.classification] ?? 0) + 1;
        if (cls === 'CALIBRATION_DRIFT' && r.driftRate !== undefined) {
          bump(res.driftBands[driftBand(r.driftRate)], engineSaysFault);
        }
        res.rootCauseTotal += engineSaysFault ? 1 : 0;
        if (engineSaysFault && pkt.classification === cls) res.rootCauseHits += 1;
        bump(res.naive[cls], naiveSaysFault);
      } else {
        res.clean.rows += 1;
        if (engineSaysFault) res.clean.engineFlags += 1;
        if (naiveSaysFault) res.clean.naiveFlags += 1;
        if (r.temp !== null && r.temp >= p95) {
          res.clean.extremes += 1;
          if (engineSaysFault) res.clean.extremesFlagged += 1;
        }
      }
    }
  });

  return res;
}

function bump(t: Tally, predicted: boolean) {
  if (predicted) t.tp += 1;
  else t.fn += 1;
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function main() {
  console.log('─'.repeat(78));
  console.log('METSHIELD AI — REAL-RECORD ANOMALY-INJECTED BENCHMARK');
  console.log(`Seeded mulberry32 seed=${SEED} · 30-day episodes · recorded hourly observations`);
  console.log(`Sources: Meteostat bulk hourly (ISD/GHCN station reports), ${STATIONS.length} Indian stations`);
  console.log('─'.repeat(78));

  const results: StationResult[] = [];
  for (const s of STATIONS) {
    try {
      const r = runStation(s);
      if (r) {
        results.push(r);
        console.log(`  ${s.wmo} ${s.name.padEnd(26)} ${r.episodes} episodes · ${r.rows.toLocaleString()} rows`);
      }
    } catch (err) {
      console.warn(`  ${s.wmo} ${s.name}: ${(err as Error).message}`);
    }
  }

  if (results.length === 0) {
    console.error('\nNo usable records. Run: node scripts/fetch-real-aws-data.mjs');
    process.exit(1);
  }

  // Aggregate every station into one table.
  const total = {
    engine: Object.fromEntries(FAULT_CLASSES.map((f) => [f, emptyTally()])) as Record<FaultClass, Tally>,
    naive: Object.fromEntries(FAULT_CLASSES.map((f) => [f, emptyTally()])) as Record<FaultClass, Tally>,
    clean: { rows: 0, engineFlags: 0, naiveFlags: 0, extremes: 0, extremesFlagged: 0 },
    rootCauseHits: 0,
    rootCauseTotal: 0,
  };

  const driftBands = Object.fromEntries(
    DRIFT_BANDS.map((b) => [b, emptyTally()])
  ) as Record<string, Tally>;

  const verdicts = Object.fromEntries(
    FAULT_CLASSES.map((f) => [f, {} as Record<string, number>])
  ) as Record<string, Record<string, number>>;

  for (const r of results) {
    for (const f of FAULT_CLASSES) {
      total.engine[f].tp += r.engine[f].tp;
      total.engine[f].fn += r.engine[f].fn;
      total.naive[f].tp += r.naive[f].tp;
      total.naive[f].fn += r.naive[f].fn;
    }
    for (const b of DRIFT_BANDS) {
      driftBands[b].tp += r.driftBands[b].tp;
      driftBands[b].fn += r.driftBands[b].fn;
    }
    for (const f of FAULT_CLASSES) {
      for (const [verdict, n] of Object.entries(r.verdicts[f] ?? {})) {
        verdicts[f][verdict] = (verdicts[f][verdict] ?? 0) + n;
      }
    }
    total.clean.rows += r.clean.rows;
    total.clean.engineFlags += r.clean.engineFlags;
    total.clean.naiveFlags += r.clean.naiveFlags;
    total.clean.extremes += r.clean.extremes;
    total.clean.extremesFlagged += r.clean.extremesFlagged;
    total.rootCauseHits += r.rootCauseHits;
    total.rootCauseTotal += r.rootCauseTotal;
  }

  console.log('\n' + '─'.repeat(78));
  console.log('PER-FAULT RECALL — MetShield engine vs static range QC');
  console.log('─'.repeat(78));
  console.log('Fault class'.padEnd(24) + 'Injected'.padStart(10) + 'Engine'.padStart(10) + 'Range QC'.padStart(11));
  for (const f of FAULT_CLASSES) {
    const e = total.engine[f];
    const n = total.naive[f];
    const injected = e.tp + e.fn;
    console.log(
      f.padEnd(24) +
        String(injected).padStart(10) +
        pct(injected ? e.tp / injected : 0).padStart(10) +
        pct(injected ? n.tp / injected : 0).padStart(11)
    );
  }

  const eAll = FAULT_CLASSES.reduce(
    (a, f) => ({ tp: a.tp + total.engine[f].tp, fn: a.fn + total.engine[f].fn }),
    { tp: 0, fn: 0 }
  );
  const nAll = FAULT_CLASSES.reduce(
    (a, f) => ({ tp: a.tp + total.naive[f].tp, fn: a.fn + total.naive[f].fn }),
    { tp: 0, fn: 0 }
  );

  const engineScore = score({ tp: eAll.tp, fp: total.clean.engineFlags, fn: eAll.fn });
  const naiveScore = score({ tp: nAll.tp, fp: total.clean.naiveFlags, fn: nAll.fn });

  console.log('\n' + '─'.repeat(78));
  console.log('BINARY FAULT DETECTION — injected faults vs real weather');
  console.log('─'.repeat(78));
  for (const [label, s] of [
    ['MetShield engine', engineScore],
    ['Static range QC ', naiveScore],
  ] as const) {
    console.log(
      `${label}   precision ${pct(s.precision).padStart(6)}   recall ${pct(s.recall).padStart(6)}   F1 ${pct(s.f1).padStart(6)}`
    );
  }

  console.log('\n' + '─'.repeat(78));
  console.log('WHAT EACH MISSED FAULT WAS CALLED INSTEAD');
  console.log('─'.repeat(78));
  for (const f of FAULT_CLASSES) {
    const counts = verdicts[f] ?? {};
    const tot = Object.values(counts).reduce((a, b) => a + b, 0);
    if (tot === 0) continue;
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k.replace('_OPERATION', '').replace('GENUINE_CONVECTIVE_EVENT', 'WEATHER')} ${Math.round((v / tot) * 100)}%`)
      .join(' · ');
    console.log(`${f.padEnd(22)} ${top}`);
  }

  console.log('\n' + '─'.repeat(78));
  console.log('CALIBRATION DRIFT — recall by injection RATE (a single average hides this)');
  console.log('─'.repeat(78));
  for (const b of DRIFT_BANDS) {
    const t = driftBands[b];
    const n = t.tp + t.fn;
    console.log(`${b.padEnd(18)} injected ${String(n).padStart(6)}   engine recall ${pct(n ? t.tp / n : 0).padStart(6)}`);
  }

  console.log('\n' + '─'.repeat(78));
  console.log('REAL WEATHER MUST PASS — false alarms on CLEAN recorded observations');
  console.log('─'.repeat(78));
  const cleanRows = total.clean.rows;
  console.log(`Clean rows scored                 : ${cleanRows.toLocaleString()}`);
  console.log(
    `Engine flagged as fault           : ${total.clean.engineFlags.toLocaleString()}  (${pct(cleanRows ? total.clean.engineFlags / cleanRows : 0)})`
  );
  console.log(
    `Range QC flagged as fault         : ${total.clean.naiveFlags.toLocaleString()}  (${pct(cleanRows ? total.clean.naiveFlags / cleanRows : 0)})`
  );
  console.log(
    `Top-5% hottest clean hours        : ${total.clean.extremes.toLocaleString()} · engine quarantined ${total.clean.extremesFlagged.toLocaleString()} (${pct(
      total.clean.extremes ? total.clean.extremesFlagged / total.clean.extremes : 0
    )})`
  );

  if (total.rootCauseTotal > 0) {
    console.log(
      `\nRoot cause named correctly        : ${((total.rootCauseHits / total.rootCauseTotal) * 100).toFixed(1)}% of detected faults`
    );
  }

  const payload = {
    generatedBy: 'scripts/benchmark-real-injected.ts',
    seed: SEED,
    episodeHours: EPISODE_HOURS,
    dataSource: 'Meteostat bulk hourly v2 (ISD/GHCN station reports)',
    stations: results,
    aggregate: { engine: engineScore, naive: naiveScore, clean: total.clean, rootCause: { hits: total.rootCauseHits, total: total.rootCauseTotal } },
  };
  mkdirSync(join('data', 'benchmark'), { recursive: true });
  const outPath = join('data', 'benchmark', `real-injected-${SEED}.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main();
