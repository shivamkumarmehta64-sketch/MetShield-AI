/**
 * MetShield AI — measured benchmark numbers
 * ==========================================
 * The single source of truth for every performance figure the site shows.
 * It is `data/benchmark-results.json`, written by `npm run bench:qc`, which
 * is the only thing in this repository that measures the engine. Components
 * import this module; they never restate a figure from memory. The old
 * "3.8ms" on the landing page was a number with no measurement behind it, and
 * this module exists so that class of number cannot be reintroduced.
 *
 * ── THE LABEL EVERY UI MUST CARRY ──────────────────────────────────────
 * These figures are measured on a SYNTHETIC ANOMALY-INJECTED SCENARIO SUITE
 * built by the benchmark harness — 1200 labelled scenarios at fixed seed, not
 * live IMD / MOSDAC telemetry. A perfect score here says the engine
 * separates the fault modes we know how to inject, under the noise model the
 * harness chose. It does NOT say the engine scores 100% on real station data,
 * and no UI may present it as if it does. Any surface rendering these numbers
 * must show `SYNTHETIC_SUITE_LABEL` (or an equivalent phrase) next to them.
 *
 * ── WHY THIS THROWS ───────────────────────────────────────────────────
 * If the artifact is missing or malformed this module throws. It does not
 * substitute a default. A silent fallback to a plausible-looking number is
 * the exact defect this whole effort exists to remove: a figure that renders
 * whether or not anything was ever measured cannot be distinguished from a
 * figure that was. Failing loudly hands the decision to the caller, which can
 * say so on screen.
 */

import raw from '../data/benchmark-results.json';

/** Human-readable provenance string. Show it; do not summarise it away. */
export const SYNTHETIC_SUITE_LABEL =
  'Synthetic anomaly-injected scenario suite (1200 labelled cases, fixed seed) — not live IMD/MOSDAC telemetry.';

/** A name in `classification`, spelled out by the engine rather than by a UI. */
export type BenchmarkClassification =
  | 'NOMINAL_OPERATION'
  | 'GENUINE_CONVECTIVE_EVENT'
  | 'SENSOR_SPIKE'
  | 'FROZEN_VALUE'
  | 'CALIBRATION_DRIFT'
  | 'TELEMETRY_PACKET_LOSS';

export interface BenchmarkLatencyMs {
  /** Mean classification cost. */
  mean: number;
  /** 50th percentile. */
  p50: number;
  /**
   * 95th percentile. **This is the number to put on screen.** p50 understates
   * the worst case and `max` overstates it, because a short Node run collects
   * scheduler preemptions and GC pauses into the top of the distribution and
   * those are properties of the process, not of the engine.
   */
  p95: number;
  /**
   * Slowest single call in the run. On a ~17k-sample Node run this is
   * scheduler and GC noise, not a real tail — a figure here can sit an order
   * of magnitude above p95 without anything about the engine having changed.
   * Do not present it as the detection speed; see `conditions.note`.
   */
  max: number;
}

export interface BenchmarkPerClass {
  label: BenchmarkClassification;
  support: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface BenchmarkStormVsFault {
  /** The two classes this task discriminates. */
  labels: [BenchmarkClassification, BenchmarkClassification];
  support: number;
  correct: number;
  accuracy: number;
}

export interface BenchmarkSafetyCritical {
  /** Real storms the engine quarantined as faults — suppresses a real warning. */
  stormsQuarantinedAsFaults: number;
  /** Nominal data raised as an anomaly — trains operators to ignore alerts. */
  nominalRaisedAsAnomaly: number;
  /** Real faults passed as valid — corrupts NWP assimilation. */
  faultsPassedAsValid: number;
}

export interface BenchmarkConditions {
  /** e.g. "Node.js v22.x (tsx)". Read this out loud next to the number. */
  runtime: string;
  /** e.g. "linux/x64". */
  platform: string;
  /** One line: what was actually timed. */
  measured: string;
  /** The caveat that must travel with the figure. */
  note: string;
}

export interface BenchmarkResults {
  schemaVersion: number;
  /** PRNG seed. Re-running the benchmark on this seed reproduces the corpus. */
  seed: number;
  scenarioCount: number;
  /** ISO timestamp of the measurement run. Provenance only — it varies by design. */
  generatedAt: string;
  /** How many `processIngestedObservation` calls the latency percentiles cover. */
  latencySampleCount: number;
  /** Fraction correct across the whole suite, 0..1. */
  accuracy: number;
  /** Mean of per-class F1, 0..1. */
  macroF1: number;
  perClass: BenchmarkPerClass[];
  confusionMatrix: {
    labels: BenchmarkClassification[];
    /** `counts[i][j]` = scenarios injected as `labels[i]`, verdict `labels[j]`. */
    counts: number[][];
  };
  stormVsFault: BenchmarkStormVsFault;
  safetyCritical: BenchmarkSafetyCritical;
  latencyMs: {
    /** One observation in, one verdict out. The unit an ingest claim is made in. */
    perTick: BenchmarkLatencyMs;
    /** A whole scenario: 8 warm-up + 6 post-injection classify calls. */
    perScenario: BenchmarkLatencyMs;
  };
  conditions: BenchmarkConditions;
}

const ARTIFACT_SOURCE = 'data/benchmark-results.json';

function fail(detail: string): never {
  throw new Error(
    `MetShield AI — benchmark artifact unusable (${ARTIFACT_SOURCE}): ${detail}\n` +
      'These figures are measured, not authored. Run `npm run bench:qc` to regenerate ' +
      `${ARTIFACT_SOURCE}, then commit it. The module deliberately has no default values: ` +
      'a benchmark number that renders when nothing was measured is indistinguishable from ' +
      'one that was.'
  );
}

/**
 * Every field of the artifact is read out of an `unknown` and checked, rather
 * than read off an object TypeScript has already blessed. That distinction is
 * the whole point: `resolveJsonModule` types the import as `BenchmarkResults`
 * the moment it parses, which means a typo in this interface, or a field the
 * writer stopped emitting, would typecheck and reach a component silently.
 * Nothing here trusts the static type — it re-derives one from the data.
 */

/** A plain record view of an unknown value, for structural field probes. */
type View = Record<string, unknown>;

function asView(value: unknown, what: string): View {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`expected ${what} to be an object, got ${value === null ? 'null' : Array.isArray(value) ? 'an array' : typeof value}.`);
  }
  return value as View;
}

function readNumber(v: View, key: string, where: string): number {
  return numberAt(v[key], `${where}${key}`);
}

function numberAt(n: unknown, where: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    fail(`\`${where}\` is missing or not a finite number.`);
  }
  return n;
}

/**
 * A count: a whole number of scenarios. JSON has no `NaN`, but a non-finite
 * value would have serialised to `null` and reached a UI wearing the type
 * `number`, which is exactly the sort of quiet lie this module refuses.
 */
function countAt(n: unknown, where: string): number {
  const v = numberAt(n, where);
  if (!Number.isInteger(v) || v < 0) {
    fail(`\`${where}\` must be a non-negative whole number, got ${v}.`);
  }
  return v;
}

/** A rate in 0..1 — precision, recall, F1, accuracy. */
function fractionAt(n: unknown, where: string): number {
  const v = numberAt(n, where);
  if (v < 0 || v > 1) fail(`\`${where}\` is outside 0..1.`);
  return v;
}

function countIn(v: View, key: string, where: string): number {
  return countAt(v[key], `${where}${key}`);
}

function fractionIn(v: View, key: string, where: string): number {
  return fractionAt(v[key], `${where}${key}`);
}

function readText(v: View, key: string, where: string): string {
  const s = v[key];
  if (typeof s !== 'string' || s.length === 0) fail(`\`${where}${key}\` is missing or empty.`);
  return s;
}

/**
 * A class name from the artifact. Deliberately only checked as a non-empty
 * string: the label vocabulary belongs to `lib/anomalyLogic.ts`, and this
 * module must keep working when that vocabulary grows without a schema bump.
 */
function readLabel(value: unknown, where: string): BenchmarkClassification {
  if (typeof value !== 'string' || value.length === 0) fail(`\`${where}\` is missing or empty.`);
  return value as BenchmarkClassification;
}

const RATE_FIELDS = ['precision', 'recall', 'f1'] as const;
const LATENCY_SCOPES = ['perTick', 'perScenario'] as const;
const LATENCY_STATS = ['mean', 'p50', 'p95', 'max'] as const;
const SAFETY_FIELDS = [
  'stormsQuarantinedAsFaults',
  'nominalRaisedAsAnomaly',
  'faultsPassedAsValid',
] as const;

/** A latency block to fill in. Every field is overwritten or the run fails. */
function blankLatency(): BenchmarkLatencyMs {
  return { mean: 0, p50: 0, p95: 0, max: 0 };
}

/**
 * Validates an unknown value as a benchmark artifact and returns it typed.
 *
 * Narrowing rather than `asserts`, on purpose: `asserts value is T` narrows a
 * variable the *caller* owns, so it cannot return a value, and the assignment
 * `bench = raw` would then be checked against the static JSON type instead of
 * anything this function proved. Returning the validated object makes the
 * guarantee explicit at the assignment site.
 *
 * @throws if any field is missing, mistyped, or out of range.
 */
export function assertArtifact(value: unknown): BenchmarkResults {
  const r = asView(value, 'the artifact');

  const schemaVersion = readNumber(r, 'schemaVersion', '');
  const seed = readNumber(r, 'seed', '');
  const scenarioCount = countIn(r, 'scenarioCount', '');
  const latencySampleCount = countIn(r, 'latencySampleCount', '');
  const generatedAt = readText(r, 'generatedAt', '');
  if (Number.isNaN(Date.parse(generatedAt))) {
    fail('`generatedAt` is not a parseable ISO timestamp.');
  }
  const accuracy = fractionIn(r, 'accuracy', '');
  const macroF1 = fractionIn(r, 'macroF1', '');

  // perClass — the `as const` loop, over all four fields the brief names.
  const rawPerClass = r.perClass;
  if (!Array.isArray(rawPerClass) || rawPerClass.length === 0) {
    fail('`perClass` is missing or empty.');
  }
  const perClass: BenchmarkPerClass[] = rawPerClass.map((entry, i) => {
    // A `perClass` row that is not an object is the most likely shape break:
    // a future writer emitting `null` for an absent class, or the array
    // nested one level too deep.
    const c = asView(entry, `perClass[${i}]`);
    const row: BenchmarkPerClass = {
      label: readLabel(c.label, `perClass[${i}].label`),
      support: countIn(c, 'support', `perClass[${i}].`),
      precision: 0,
      recall: 0,
      f1: 0,
    };
    for (const field of RATE_FIELDS) {
      row[field] = fractionIn(c, field, `perClass[${i}].`);
    }
    return row;
  });

  // confusionMatrix
  const cm = asView(r.confusionMatrix, '`confusionMatrix`');
  const rawLabels = cm.labels;
  const rawCounts = cm.counts;
  if (!Array.isArray(rawLabels) || rawLabels.length === 0) {
    fail('`confusionMatrix.labels` is missing or empty.');
  }
  if (!Array.isArray(rawCounts)) fail('`confusionMatrix.counts` must be an array.');
  const labels = rawLabels.map((l, i) => readLabel(l, `confusionMatrix.labels[${i}]`));
  if (rawCounts.length !== labels.length) {
    fail('`confusionMatrix.counts` has a different number of rows than `labels`.');
  }
  const counts: number[][] = rawCounts.map((row, i) => {
    if (!Array.isArray(row)) fail(`confusionMatrix row ${i} is not an array.`);
    if (row.length !== labels.length) {
      fail(`confusionMatrix row ${i} is not a square row of length ${labels.length}.`);
    }
    return row.map((cell, j) => countAt(cell, `confusionMatrix.counts[${i}][${j}]`));
  });

  // Every scored class has to appear on the confusion-matrix axis, or the
  // matrix is describing a different suite than the one the rates came from.
  for (const c of perClass) {
    if (!labels.includes(c.label)) {
      fail(`perClass label \`${c.label}\` does not appear in confusionMatrix.labels.`);
    }
  }

  // stormVsFault
  const svf = asView(r.stormVsFault, '`stormVsFault`');
  const rawSvfLabels = svf.labels;
  if (!Array.isArray(rawSvfLabels) || rawSvfLabels.length !== 2) {
    fail('`stormVsFault.labels` must be an array of two labels.');
  }
  const stormVsFault: BenchmarkStormVsFault = {
    labels: [
      readLabel(rawSvfLabels[0], 'stormVsFault.labels[0]'),
      readLabel(rawSvfLabels[1], 'stormVsFault.labels[1]'),
    ],
    support: countIn(svf, 'support', 'stormVsFault.'),
    correct: countIn(svf, 'correct', 'stormVsFault.'),
    accuracy: fractionIn(svf, 'accuracy', 'stormVsFault.'),
  };

  // safetyCritical — counts, so non-negative whole numbers.
  const sc = asView(r.safetyCritical, '`safetyCritical`');
  const safetyCritical: BenchmarkSafetyCritical = {
    stormsQuarantinedAsFaults: 0,
    nominalRaisedAsAnomaly: 0,
    faultsPassedAsValid: 0,
  };
  for (const field of SAFETY_FIELDS) {
    safetyCritical[field] = countIn(sc, field, 'safetyCritical.');
  }

  // latencyMs
  const lat = asView(r.latencyMs, '`latencyMs`');
  const latencyMs: BenchmarkResults['latencyMs'] = { perTick: blankLatency(), perScenario: blankLatency() };
  for (const scope of LATENCY_SCOPES) {
    const block = asView(lat[scope], `latencyMs.${scope}`);
    for (const stat of LATENCY_STATS) {
      // Latency is a duration: finite and non-negative. Not a fraction, and
      // not a count — a negative here would mean the clock was read backwards.
      const n = readNumber(block, stat, `latencyMs.${scope}.`);
      if (n < 0) fail(`\`latencyMs.${scope}.${stat}\` is negative.`);
      latencyMs[scope][stat] = n;
    }
  }

  const cond = asView(r.conditions, '`conditions`');
  const conditions: BenchmarkConditions = {
    runtime: readText(cond, 'runtime', 'conditions.'),
    platform: readText(cond, 'platform', 'conditions.'),
    measured: readText(cond, 'measured', 'conditions.'),
    note: readText(cond, 'note', 'conditions.'),
  };

  return {
    schemaVersion,
    seed,
    scenarioCount,
    generatedAt,
    latencySampleCount,
    accuracy,
    macroF1,
    perClass,
    confusionMatrix: { labels, counts },
    stormVsFault,
    safetyCritical,
    latencyMs,
    conditions,
  };
}

/**
 * The measured artifact, validated. Importing this module runs the validation
 * once at module load; a malformed artifact therefore throws at import time,
 * which is the loudest failure available and the only one that cannot be
 * mistaken for a working page.
 */
export const bench: BenchmarkResults = assertArtifact(raw);

/** Latency for one observation in, one verdict out. */
export const latencyPerTickMs: BenchmarkLatencyMs = bench.latencyMs.perTick;
/** Latency for a whole 14-tick scenario. */
export const latencyPerScenarioMs: BenchmarkLatencyMs = bench.latencyMs.perScenario;
/** The runtime and caveats the latency figure was measured under. */
export const benchmarkConditions: BenchmarkConditions = bench.conditions;
/** Fraction of scenarios classified correctly, 0..1. */
export const accuracy: number = bench.accuracy;
/** Mean per-class F1, 0..1. */
export const macroF1: number = bench.macroF1;
/** The two-class storm-vs-sensor-spike task the project thesis rests on. */
export const stormVsFault: BenchmarkStormVsFault = bench.stormVsFault;
/** Counts for the three failure modes that end real deployments. */
export const safetyCritical: BenchmarkSafetyCritical = bench.safetyCritical;
