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
  /** 95th percentile. */
  p95: number;
  /** Slowest single call in the run. */
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
 * The artifact arrives through the bundler, which has already parsed it as
 * JSON, so a syntax error surfaces at build time rather than here. What can
 * still be wrong is the shape: a half-written file, a hand-edited one, or an
 * older schema. All three are caught below, and all three are reported rather
 * than papered over.
 */
function assertArtifact(value: unknown): asserts value is BenchmarkResults {
  if (value === null || typeof value !== 'object') {
    fail(`expected a JSON object, got ${value === null ? 'null' : typeof value}.`);
  }
  const r = value as Partial<BenchmarkResults>;

  if (typeof r.schemaVersion !== 'number') fail('`schemaVersion` is missing or not a number.');
  if (typeof r.seed !== 'number') fail('`seed` is missing or not a number.');
  if (typeof r.scenarioCount !== 'number') fail('`scenarioCount` is missing or not a number.');
  if (typeof r.generatedAt !== 'string' || Number.isNaN(Date.parse(r.generatedAt))) {
    fail('`generatedAt` is missing or is not an ISO timestamp.');
  }
  if (typeof r.accuracy !== 'number' || r.accuracy < 0 || r.accuracy > 1) {
    fail('`accuracy` is missing or outside 0..1.');
  }
  if (typeof r.macroF1 !== 'number' || r.macroF1 < 0 || r.macroF1 > 1) {
    fail('`macroF1` is missing or outside 0..1.');
  }
  if (!Array.isArray(r.perClass) || r.perClass.length === 0) {
    fail('`perClass` is missing or empty.');
  }
  for (const c of r.perClass) {
    if (typeof c?.label !== 'string' || typeof c.f1 !== 'number' || typeof c.support !== 'number') {
      fail('a `perClass` entry is missing `label`, `support` or `f1`.');
    }
  }
  if (!Array.isArray(r.confusionMatrix?.labels) || !Array.isArray(r.confusionMatrix?.counts)) {
    fail('`confusionMatrix.labels` and `confusionMatrix.counts` must both be arrays.');
  }
  if (r.confusionMatrix.counts.length !== r.confusionMatrix.labels.length) {
    fail('`confusionMatrix.counts` has a different number of rows than `labels`.');
  }
  for (const [i, row] of r.confusionMatrix.counts.entries()) {
    if (!Array.isArray(row) || row.length !== r.confusionMatrix.labels.length) {
      fail(`confusionMatrix row ${i} is not a square row of length ${r.confusionMatrix.labels.length}.`);
    }
  }
  if (typeof r.stormVsFault?.accuracy !== 'number' || typeof r.stormVsFault.support !== 'number') {
    fail('`stormVsFault` is missing `accuracy` or `support`.');
  }
  for (const key of ['stormsQuarantinedAsFaults', 'nominalRaisedAsAnomaly', 'faultsPassedAsValid'] as const) {
    if (typeof r.safetyCritical?.[key] !== 'number') fail(`\`safetyCritical.${key}\` is missing.`);
  }
  for (const scope of ['perTick', 'perScenario'] as const) {
    const block = r.latencyMs?.[scope];
    if (!block) fail(`\`latencyMs.${scope}\` is missing.`);
    for (const stat of ['mean', 'p50', 'p95', 'max'] as const) {
      if (typeof block[stat] !== 'number') fail(`\`latencyMs.${scope}.${stat}\` is missing.`);
    }
  }
  for (const key of ['runtime', 'platform', 'measured', 'note'] as const) {
    if (typeof r.conditions?.[key] !== 'string' || r.conditions[key].length === 0) {
      fail(`\`conditions.${key}\` is missing or empty.`);
    }
  }
}

/**
 * The measured artifact, validated. Importing this module runs the validation
 * once at module load; a malformed artifact therefore throws at import time,
 * which is the loudest failure available and the only one that cannot be
 * mistaken for a working page.
 */
assertArtifact(raw);

/** The measured benchmark run. Never hand-edited, never defaulted. */
export const bench: BenchmarkResults = raw;

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
