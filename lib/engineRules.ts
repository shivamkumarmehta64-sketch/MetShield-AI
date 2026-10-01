/**
 * The engine's own words, for the landing-page rule inspector.
 * ----------------------------------------------------------------------
 * This module contains NO logic. It is a transcription surface: the numbers
 * and the source lines below were copied out of `NICWMOAnomalyEngine.evaluate()`
 * in `lib/anomalyLogic.ts` and exist so a judge can read the exact comparison
 * the engine performs instead of taking a diagram's word for it.
 *
 * Why a transcription is not a second source of truth
 * ---------------------------------------------------
 * `components/landing/QcPipelineBand.tsx` already hardcodes the same figures,
 * so adding an inspector could easily have created a third copy. The
 * difference here is that this copy is *watched*: `__tests__/engineRules.test.ts`
 * re-reads `lib/anomalyLogic.ts` from disk and fails if any literal in
 * `EVALUATE_STORM_RULE.source` or any bound in `evidence` no longer appears in
 * the engine. A drifting display copy breaks the build; the pipeline band's copy
 * does not. That asymmetry is the point.
 *
 * Do NOT use this file to make decisions. Nothing here is evaluated — if you
 * need the verdict, call the engine. Do NOT edit `lib/anomalyLogic.ts` to serve
 * this view; the engine is the product and the inspector is a window onto it.
 */

export interface EngineEvidence {
  /** Which measured quantity this bound constrains. */
  channel: 'PRESSURE' | 'HUMIDITY' | 'TEMPERATURE';
  /** Symbol as the engine names it, verbatim. */
  symbol: string;
  /** Operator as written in the source. */
  operator: string;
  /** Threshold as written in the source. */
  bound: string;
  /**
   * The comparisons this row stands for, character-for-character as they
   * appear in `evaluate()` — one per delta window, because each conjunct is a
   * disjunction. These are what the guard test checks against the engine; the
   * display fields above are for the reader.
   */
  comparisons: string[];
  /** Rendered value with units preserved from the source comment. */
  value: string;
}

export interface EngineRule {
  /** Path of the file the rule lives in, for the audit header. */
  sourceFile: string;
  /** Method within that file. */
  sourceFn: string;
  /** Stage name, matching the decision chain on the landing page. */
  stage: string;
  /** One-line statement of what the rule decides. */
  headline: string;
  /** The threshold display rows: what was measured, against what. */
  evidence: EngineEvidence[];
  /**
   * Verbatim source lines from `evaluate()`, indentation preserved. Copied
   * character-for-character including the non-ASCII Δ, ≤ and ° — the guard
   * test matches on these, so a typo here fails the suite rather than
   * shipping a subtly wrong proof panel.
   */
  source: string[];
  /** Why the rule has the shape it has. */
  rationale: string;
}

export const EVALUATE_STORM_RULE: EngineRule = {
  sourceFile: 'lib/anomalyLogic.ts',
  sourceFn: 'NICWMOAnomalyEngine.evaluate()',
  stage: 'STAGE 03 · PHYSICAL CONSISTENCY',
  headline: 'A pressure fall is only a storm when humidity rises and temperature drops alongside it.',
  evidence: [
    {
      channel: 'PRESSURE',
      symbol: 'pD / rPD',
      operator: '<=',
      bound: '-2.5',
      comparisons: ['pD <= -2.5', 'rPD <= -2.5'],
      value: 'ΔP ≤ −2.5 hPa',
    },
    {
      channel: 'HUMIDITY',
      symbol: 'hD / rHD',
      operator: '>=',
      bound: '15',
      comparisons: ['hD >= 15', 'rHD >= 15'],
      value: 'ΔRH ≥ +15 %',
    },
    {
      channel: 'TEMPERATURE',
      symbol: 'tD / rTD',
      operator: '<=',
      bound: '-1.5',
      comparisons: ['tD <= -1.5', 'rTD <= -1.5'],
      value: 'ΔT ≤ −1.5 °C',
    },
  ],
  source: [
    '// Convective storm discrimination (Coupled Microburst / Kalbaisakhi signature)',
    'const isPD = pD <= -2.5 || rPD <= -2.5; // Benchmark: ΔP <= -2.5 hPa',
    'const isHS = hD >= 15 || rHD >= 15;     // Benchmark: ΔRH >= +15%',
    'const isC = tD <= -1.5 || rTD <= -1.5;  // Benchmark: ΔT <= -1.5°C',
    'const isStorm = !isFrozen && rawP !== null && rawH !== null && rawT !== null && isPD && isHS && isC;',
  ],
  rationale:
    'Each test is a disjunction: the single-tick delta OR the four-tick rolling delta. One barometric tick alone is not evidence — a squall front arrives as a trend, so the rule fires on either the step or the slope. All three conjunctions must hold in the same packet, and a frozen temperature channel vetoes the storm outright (isFrozen && …) so a stuck register cannot manufacture weather. A pressure drop on its own reaches the drift branch instead: that asymmetry is what stops a real event being discarded and a dead sensor being believed.',
};

/**
 * Flat text of the storm rule as it is displayed, for the COPY RULE button.
 * Built from the same fields the panel renders, so the clipboard can never
 * drift from the screen.
 */
export function stormRuleAsText(): string {
  const rows = EVALUATE_STORM_RULE.evidence.map((e) => e.value).join('  AND  ');
  return [
    `${EVALUATE_STORM_RULE.sourceFile} · ${EVALUATE_STORM_RULE.sourceFn}`,
    EVALUATE_STORM_RULE.stage,
    '',
    rows,
    '',
    ...EVALUATE_STORM_RULE.source,
  ].join('\n');
}