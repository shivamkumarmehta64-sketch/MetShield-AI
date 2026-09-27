/**
 * Data provenance — single source of truth for "where did this number come from?"
 *
 * WHY THIS EXISTS
 * ---------------
 * This product displays a great deal of SYNTHETIC data inside a compliance
 * context: seeded demo telemetry, a fabricated district registry, a rule-based
 * classifier whose accuracy metrics were invented, and a non-cryptographic
 * "seal" labelled as HMAC-SHA256. The engineering was often defensible; the
 * LABELS were not. A number that looks official but was synthesised is worse
 * than an obvious placeholder, because a reviewer cannot tell which is which.
 *
 * This module makes provenance a first-class, greppable property of the data
 * rather than a comment somebody remembers to write. Every surface that can
 * show a simulated value should render a <ProvenanceBadge />.
 *
 * When a real feed replaces a simulated source, flip its entry here. That one
 * edit should be enough to retire the warning UI.
 */

export type Provenance = 'LIVE' | 'DERIVED' | 'SIMULATED';

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  LIVE: 'Live feed',
  DERIVED: 'Computed',
  SIMULATED: 'Simulated',
};

export const PROVENANCE_DESCRIPTIONS: Record<Provenance, string> = {
  LIVE: 'Measured from an upstream provider in this request.',
  DERIVED: 'Calculated from other measurements in this repo (e.g. QNH pressure, XAI weights).',
  SIMULATED: 'Generated for demonstration. Not a real measurement.',
};

/**
 * Named data sources and what each one actually is.
 *
 * `SIMULATED` entries are the ones that must never be presented as official
 * measurements without an adjacent badge.
 */
export const DATA_SOURCES = {
  openMeteoLive: {
    label: 'Open-Meteo (live)',
    provenance: 'LIVE',
    detail: 'Real observation fetched from api.open-meteo.com via /api/weather.',
  },
  imdOfficial: {
    label: 'IMD official feed',
    provenance: 'LIVE',
    detail: 'Requires IMD_API_KEY. Unavailable in this environment, so the IMD branch is skipped.',
  },
  seededTelemetry: {
    label: 'Seeded demo telemetry',
    provenance: 'SIMULATED',
    detail: 'Deterministic pseudo-random packets from lib/anomalyLogic.ts. No physical instrument produced these.',
  },
  syntheticAnalytics: {
    label: 'Synthetic analytics series',
    provenance: 'SIMULATED',
    detail: 'Client-side Math.random() series with a scripted hardware-failure gap. Illustrative only.',
  },
  ruleBasedClassifier: {
    label: 'Rule-based threshold classifier',
    provenance: 'DERIVED',
    detail:
      'A hand-written if/else chain in lib/mlAnomalyModel.ts. There are NO trained weights and no measured accuracy — it must not be quoted as a model with a precision/recall score.',
  },
  demoIntegritySeal: {
    label: 'Demo integrity checksum',
    provenance: 'DERIVED',
    detail:
      'A non-cryptographic FNV-style checksum. It is NOT HMAC-SHA256 and NOT a Merkle root. It detects accidental corruption only and provides no tamper resistance.',
  },
  physicalModelFallback: {
    label: 'Physical model fallback',
    provenance: 'SIMULATED',
    detail:
      'Substituted when the upstream weather fetch fails or is rate-limited. Plausible numbers, not observations.',
  },
  climatologicalNormals: {
    label: 'Approximate climatological normals',
    provenance: 'DERIVED',
    detail:
      'Coarse hand-entered reference values (24.5–41.5 °C) used to compute heatwave departure. They are approximations, not IMD gridded climatology.',
  },
  heatwaveForecast: {
    label: 'Illustrative forecast',
    provenance: 'SIMULATED',
    detail: 'A 5-day sinusoid (Math.sin(day * 0.8)). Not a forecast and not derived from any numerical model.',
  },
  districtRegistry: {
    label: 'District registry',
    provenance: 'SIMULATED',
    detail:
      'Contains synthesized records alongside real ones. See DISTRICT_PROVENANCE below for the exact split.',
  },
  benchmarkFixtures: {
    label: 'Benchmark fixtures',
    provenance: 'SIMULATED',
    detail:
      'Hand-authored CSV in lib/datasetParser.ts with invented station ids. Usable as an engine test, not as ground truth.',
  },
  xaiAttribution: {
    label: 'Rule-based attribution weights',
    provenance: 'DERIVED',
    detail:
      'Fixed per-tier weights (e.g. 80/10/10 on a physical-limit breach) normalised to 100%, combined with a named primary parameter. This is NOT SHAP and NOT model explainability — it is a deterministic weighting heuristic. Use this wording, not "SHAP attribution".',
  },
  voidImputation: {
    label: 'Windowed-mean imputation',
    provenance: 'DERIVED',
    detail:
      'A trailing mean over the observation window. The function is named calculateGaussianWMA but performs a flat mean rounded to 0.1 — there are no Gaussian weights. Do not call it a Gaussian WMA.',
  },
} as const satisfies Record<string, { label: string; provenance: Provenance; detail: string }>;

export type DataSourceId = keyof typeof DATA_SOURCES;

// ─── District registry provenance ────────────────────────────────────────────
//
// lib/india766Districts.ts used to ship 766 records across three id prefixes.
// 55 of them were fabricated ("Krishna Central", "Banka Central", …), each one
// shadowing a real district already in the registry purely to pad the count.
// Those have been removed, along with a duplicate Kargil that appeared under
// both "Jammu and Kashmir" (population 4.16M) and "Ladakh" (population 140k).
//
// The honest total is 710, not 766. Counts below are asserted by
// __tests__/districtDataset.test.ts and cannot silently drift.
//
// Five district names legitimately repeat across states (Aurangabad, Bilaspur,
// Hamirpur, Junagadh, Raigarh). That is correct Indian geography, not a defect;
// those records are distinguished by `state`.

export const DISTRICT_ID_PREFIXES = {
  /** Faithful real-district records. */
  real: 'DST-IND-',
  /** Real districts with adjusted attributes; provenance is not independently verified. */
  modified: 'DST-MOD-',
  /** Fabricated records. Currently empty — none remain in the registry. */
  synthesized: 'DST-SUB-',
} as const;

export const SYNTHETIC_DISTRICT_PREFIXES: readonly string[] = [
  DISTRICT_ID_PREFIXES.synthesized,
];

/** True when a district id belongs to a fabricated record. */
export function isSyntheticDistrict(districtId: string): boolean {
  return SYNTHETIC_DISTRICT_PREFIXES.some((prefix) => districtId.startsWith(prefix));
}

/**
 * The honest headline number. The UI must not claim a flat "766 districts".
 */
export const DISTRICT_REGISTRY_COUNTS = {
  total: 710,
  real: 593,
  modified: 117,
  synthesized: 0,
} as const;

/** Copy for the "766 districts" claim, corrected to match the data. */
export const DISTRICT_REGISTRY_STATEMENT =
  `${DISTRICT_REGISTRY_COUNTS.total} district records ` +
  `(${DISTRICT_REGISTRY_COUNTS.real} real, ` +
  `${DISTRICT_REGISTRY_COUNTS.modified} attribute-modified)`;
