import { describe, it, expect } from 'vitest';
import { getModelMetadata, classifyAnomaly } from '../lib/mlAnomalyModel';

/**
 * Guard against reintroducing fabricated model-performance claims.
 *
 * `getModelMetadata()` used to report `trainingAccuracy: 0.945`,
 * `f1Score: 0.92` and "Trained on 5 years of historical IMD AWS station data
 * (2018-2023)". None of it was measured — classifyAnomaly is an if/else chain
 * with no learned weights. Those numbers were rendered in AIEnginePipeline.tsx
 * and the pitch deck as if they were real evaluation results.
 *
 * If you ever train a real model, delete this file's metadata assertions and
 * replace them with output from an actual evaluation run.
 */

describe('getModelMetadata — honesty contract', () => {
  const meta = getModelMetadata();

  it('declares that this is not a trained model', () => {
    expect(meta.isTrainedModel).toBe(false);
  });

  it('identifies itself as rule-based', () => {
    expect(meta.kind).toBe('rule-based threshold classifier');
  });

  it('does NOT expose a fabricated accuracy score', () => {
    expect(meta).not.toHaveProperty('trainingAccuracy');
  });

  it('does NOT expose a fabricated F1 score', () => {
    expect(meta).not.toHaveProperty('f1Score');
  });

  it('does NOT expose a fabricated precision or recall', () => {
    expect(meta).not.toHaveProperty('precision');
    expect(meta).not.toHaveProperty('recall');
  });

  it('does NOT claim a training dataset it never saw', () => {
    expect(meta).not.toHaveProperty('trainingDatasetDescription');
  });

  it('states its basis honestly instead of citing IMD historical data', () => {
    expect(meta.basis).toMatch(/no training data/i);
  });
});

describe('classifyAnomaly — determinism', () => {
  const features = {
    tempRoC: 0.1,
    pressRoC: -0.2,
    humRoC: 0.4,
    tempAbsolute: 28.0,
    pressAbsolute: 1008,
    humAbsolute: 55,
    frozenTickCount: 0,
    spikeAmplitude: 0.1,
    driftCumulative: 0.1,
  };

  it('returns an identical result for identical input', () => {
    expect(classifyAnomaly(features)).toEqual(classifyAnomaly(features));
  });

  it('routes a sustained freeze to FROZEN_VALUE', () => {
    const r = classifyAnomaly({ ...features, frozenTickCount: 6 });
    expect(r.classification).toBe('FROZEN_VALUE');
  });

  it('routes a physically impossible temperature to SENSOR_SPIKE', () => {
    const r = classifyAnomaly({ ...features, tempAbsolute: 52 });
    expect(r.classification).toBe('SENSOR_SPIKE');
  });

  it('routes a missing channel to PACKET_LOSS', () => {
    const r = classifyAnomaly({ ...features, humAbsolute: null });
    expect(r.classification).toBe('PACKET_LOSS');
  });
});
