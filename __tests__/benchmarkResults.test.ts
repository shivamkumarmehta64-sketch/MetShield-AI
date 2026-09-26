import { describe, it, expect } from 'vitest';
import { assertArtifact, bench } from '../lib/benchmarkResults';

/**
 * The validator is the only thing standing between a malformed artifact and a
 * number rendered as fact on the site, so its refusal paths are tested rather
 * than spot-checked by hand. Every case here feeds `assertArtifact` a mutated
 * copy of the real artifact: the valid baseline is imported from the repo, so
 * a change to the writer that drops a field fails these tests too.
 */

const LABELS = [
  'NOMINAL_OPERATION',
  'GENUINE_CONVECTIVE_EVENT',
  'SENSOR_SPIKE',
  'FROZEN_VALUE',
  'CALIBRATION_DRIFT',
  'TELEMETRY_PACKET_LOSS',
];

/** A structurally valid artifact, built here so a test case needs one edit. */
function validArtifact(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    seed: 20260926,
    scenarioCount: 12,
    generatedAt: '2026-09-26T09:00:00.000Z',
    latencySampleCount: 168,
    accuracy: 1,
    macroF1: 1,
    perClass: LABELS.map(label => ({
      label,
      support: 2,
      precision: 1,
      recall: 1,
      f1: 1,
    })),
    confusionMatrix: { labels: [...LABELS], counts: LABELS.map((_, i) => LABELS.map((__, j) => (i === j ? 2 : 0))) },
    stormVsFault: {
      labels: ['GENUINE_CONVECTIVE_EVENT', 'SENSOR_SPIKE'],
      support: 4,
      correct: 4,
      accuracy: 1,
    },
    safetyCritical: {
      stormsQuarantinedAsFaults: 0,
      nominalRaisedAsAnomaly: 0,
      faultsPassedAsValid: 0,
    },
    latencyMs: {
      perTick: { mean: 0.008, p50: 0.007, p95: 0.016, max: 0.143 },
      perScenario: { mean: 0.11, p50: 0.099, p95: 0.221, max: 2.005 },
    },
    conditions: {
      runtime: 'Node.js v22.0.0 (tsx)',
      platform: 'linux/x64',
      measured: 'Offline CPU time on the classify path only',
      note: 'Not a browser measurement.',
    },
  };
}

function expectRejection(mutate: (a: Record<string, unknown>) => void, fragment: RegExp) {
  const artifact = validArtifact();
  mutate(artifact);
  expect(() => assertArtifact(artifact)).toThrow(fragment);
  expect(() => assertArtifact(artifact)).toThrow(/benchmark-results\.json/);
  expect(() => assertArtifact(artifact)).toThrow(/npm run bench:qc/);
}

describe('benchmark artifact validator', () => {
  it('accepts a well-formed artifact and returns it', () => {
    const result = assertArtifact(validArtifact());
    expect(result.accuracy).toBe(1);
    expect(result.perClass).toHaveLength(LABELS.length);
    expect(result.confusionMatrix.counts[0][0]).toBe(2);
    expect(result.latencyMs.perTick.p95).toBe(0.016);
  });

  it('accepts the committed artifact — the real file, not a fixture', () => {
    expect(() => assertArtifact(bench)).not.toThrow();
    expect(bench.perClass.every(c => c.precision >= 0 && c.precision <= 1)).toBe(true);
    expect(bench.confusionMatrix.counts.flat().every(n => Number.isInteger(n) && n >= 0)).toBe(true);
  });

  it('rejects a non-object artifact', () => {
    expect(() => assertArtifact(null)).toThrow(/expected the artifact to be an object/);
    expect(() => assertArtifact(42)).toThrow(/expected the artifact to be an object/);
    expect(() => assertArtifact([1, 2])).toThrow(/expected the artifact to be an object/);
  });

  it('rejects a missing latencyMs.perTick.p95', () => {
    expectRejection(
      a => {
        const lat = a.latencyMs as { perTick: Record<string, unknown> };
        delete lat.perTick.p95;
      },
      /`latencyMs\.perTick\.p95` is missing/
    );
  });

  it('rejects a perClass entry that is not an object', () => {
    expectRejection(a => {
      a.perClass = ['NOMINAL_OPERATION'];
    }, /expected perClass\[0\] to be an object, got string/);
  });

  it('rejects a perClass entry missing precision', () => {
    expectRejection(a => {
      const rows = a.perClass as Record<string, unknown>[];
      delete rows[0].precision;
    }, /`perClass\[0\]\.precision` is missing/);
  });

  it('rejects a perClass entry missing recall', () => {
    expectRejection(a => {
      const rows = a.perClass as Record<string, unknown>[];
      delete rows[0].recall;
    }, /`perClass\[0\]\.recall` is missing/);
  });

  it('rejects a perClass label absent from the confusion matrix', () => {
    expectRejection(a => {
      const rows = a.perClass as Record<string, unknown>[];
      rows[0].label = 'SOMETHING_ELSE';
    }, /does not appear in confusionMatrix\.labels/);
  });

  it('rejects stormVsFault missing correct', () => {
    expectRejection(a => {
      const svf = a.stormVsFault as Record<string, unknown>;
      delete svf.correct;
    }, /`stormVsFault\.correct` is missing/);
  });

  it('rejects a confusion matrix row that is not square', () => {
    expectRejection(a => {
      (a.confusionMatrix as { counts: unknown[][] }).counts[2] = [1, 2];
    }, /not a square row/);
  });

  it('rejects a non-integer or negative confusion count', () => {
    expectRejection(
      a => {
        (a.confusionMatrix as { counts: number[][] }).counts[0][0] = 200.5;
      },
      /must be a non-negative whole number/
    );
    expectRejection(
      a => {
        (a.confusionMatrix as { counts: number[][] }).counts[0][1] = -1;
      },
      /must be a non-negative whole number/
    );
  });

  it('rejects a negative safetyCritical count', () => {
    expectRejection(a => {
      (a.safetyCritical as Record<string, unknown>).faultsPassedAsValid = -3;
    }, /must be a non-negative whole number/);
  });

  it('rejects an accuracy outside 0..1', () => {
    expectRejection(a => {
      a.accuracy = 1.4;
    }, /`accuracy` is outside 0\.\.1/);
  });

  it('rejects a negative latency', () => {
    expectRejection(a => {
      (a.latencyMs as { perTick: Record<string, unknown> }).perTick.p50 = -0.001;
    }, /`latencyMs\.perTick\.p50` is negative/);
  });

  it('rejects a non-finite latency that JSON would have serialised to null', () => {
    expectRejection(a => {
      (a.latencyMs as { perTick: Record<string, unknown> }).perTick.mean = null;
    }, /`latencyMs\.perTick\.mean` is missing or not a finite number/);
  });

  it('rejects an unparseable generatedAt', () => {
    expectRejection(a => {
      a.generatedAt = 'last tuesday';
    }, /not a parseable ISO timestamp/);
  });

  it('rejects a missing latencySampleCount', () => {
    expectRejection(a => {
      delete a.latencySampleCount;
    }, /`latencySampleCount` is missing/);
  });

  it('rejects an empty conditions.note — the caveat is not optional', () => {
    expectRejection(a => {
      (a.conditions as Record<string, unknown>).note = '';
    }, /`conditions\.note` is missing or empty/);
  });
});
