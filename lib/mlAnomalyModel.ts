export interface AnomalyFeatureVector {
  tempRoC: number;
  pressRoC: number;
  humRoC: number;
  tempAbsolute: number | null;
  pressAbsolute: number | null;
  humAbsolute: number | null;
  frozenTickCount: number;
  spikeAmplitude: number;
  driftCumulative: number;
}

export interface MLPrediction {
  classification: string;
  confidence: number;
  featureImportance: Record<string, number>;
}

export function classifyAnomaly(features: AnomalyFeatureVector): MLPrediction {
  // Rule-based threshold cascade. This is NOT a trained model — see
  // getModelMetadata() below and lib/dataProvenance.ts
  // (DATA_SOURCES.ruleBasedClassifier).

  if (features.tempAbsolute === null || features.pressAbsolute === null || features.humAbsolute === null) {
    return {
      classification: 'PACKET_LOSS',
      confidence: 0.99,
      featureImportance: { tempAbsolute: 0.33, pressAbsolute: 0.33, humAbsolute: 0.34 },
    };
  }

  if (features.frozenTickCount >= 6) {
    return {
      classification: 'FROZEN_VALUE',
      confidence: 0.96,
      featureImportance: { frozenTickCount: 0.95, tempRoC: 0.05 },
    };
  }

  if (Math.abs(features.spikeAmplitude) > 3.0 || features.tempAbsolute > 50) {
    return {
      classification: 'SENSOR_SPIKE',
      confidence: 0.92,
      featureImportance: { spikeAmplitude: 0.8, tempAbsolute: 0.2 },
    };
  }

  if (Math.abs(features.driftCumulative) > 2.0) {
    return {
      classification: 'CALIBRATION_DRIFT',
      confidence: 0.88,
      featureImportance: { driftCumulative: 0.9, pressRoC: 0.1 },
    };
  }

  if (features.pressRoC <= -1.0 && features.humRoC >= 5.0 && features.tempRoC <= -0.5) {
    return {
      classification: 'CONVECTIVE_STORM',
      confidence: 0.85,
      featureImportance: { pressRoC: 0.4, humRoC: 0.4, tempRoC: 0.2 },
    };
  }

  return {
    classification: 'NOMINAL',
    confidence: 0.98,
    featureImportance: { tempRoC: 0.3, pressRoC: 0.3, humRoC: 0.4 },
  };
}

/**
 * Metadata for the classifier.
 *
 * IMPORTANT: this is NOT a trained machine-learning model. `classifyAnomaly`
 * is a hand-written if/else chain over rate-of-change features. There are no
 * learned weights, no gradient descent, and no training set.
 *
 * This function previously reported `trainingAccuracy: 0.945`, `f1Score: 0.92`
 * and claimed training on "5 years of historical IMD AWS station data
 * (2018-2023)". None of that was measured — the numbers were invented and were
 * being displayed in the UI and pitch deck as model performance.
 *
 * `confidence` values returned by classifyAnomaly are likewise heuristic
 * constants, NOT calibrated probabilities. Treat them as ranking hints only.
 *
 * The `isTrainedModel: false` flag below is a guard: any UI that wants to quote
 * a precision/recall figure must check it first.
 */
export function getModelMetadata() {
  return {
    version: '1.0.0-edge',
    /** Always false. There are no learned weights in this file. */
    isTrainedModel: false,
    kind: 'rule-based threshold classifier' as const,
    basis:
      'Hand-authored if/else chain over rate-of-change and persistence features. Deterministic; no training data was used.',
    /**
     * Intentionally omitted — previously fabricated:
     *   trainingAccuracy, f1Score, precision, recall,
     *   trainingDatasetDescription
     * Do not reintroduce these without a real evaluation harness and a
     * labelled dataset. See __tests__/mlModelMetadata.test.ts.
     */
  };
}
