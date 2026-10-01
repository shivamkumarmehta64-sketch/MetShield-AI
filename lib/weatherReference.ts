import { PRESSURE_DATUM_LABEL, type PressureDatum } from './pressureReduction';

/**
 * External weather reference — cross-check maths and its honest wording.
 * ---------------------------------------------------------------------------
 * Everything here is *informational*. None of these thresholds feeds
 * `evaluate()`, a QC flag, or a work order. They exist to answer one operator
 * question — "does an independent model roughly agree with what this AWS
 * reports?" — and the answer is advisory by construction.
 *
 * The rule this file must never break: a disagreement is not evidence that the
 * AWS is wrong. The reference is a coarse NWP/satellite reading for a grid cell
 * or nearest model point; an AWS is a point measurement. A 3 °C gap between
 * them is the method difference showing up, not a transducer fault. The
 * interpretation strings below say so explicitly rather than implying the
 * engine should act on them.
 *
 * Deliberate: no `evaluate()` import. If the reference layer ever became load
 * bearing, this dependency would be visible in the import graph.
 */

export type AgreementStatus =
  | 'CLOSE_AGREEMENT'
  | 'MODERATE_DISAGREEMENT'
  | 'STRONG_DISAGREEMENT'
  | 'REFERENCE_UNAVAILABLE';

/**
 * Advisory tolerance per channel. Chosen to sit just above the spread expected
 * between a point observation and a gridded model at the same place, so a
 * CLOSE_AGREEMENT means something. These are NOT the WMO QC thresholds in
 * `lib/anomalyLogic.ts` and are deliberately looser.
 */
export const AGREEMENT_TOLERANCE = {
  temperatureC: 2.0,
  humidityPct: 15,
  pressureHpa: 2.0,
  windKph: 8.0,
} as const;

export interface ReferenceReading {
  /** Provider timestamp, already IST (the request pins the zone). Null if absent. */
  observedAt: string | null;
  temperature: number | null;
  relativeHumidity: number | null;
  pressure: number | null;
  pressureDatum: PressureDatum;
  windSpeed: number | null;
  precipitation: number | null;
}

export interface StationReading {
  temperature: number | null;
  relativeHumidity: number | null;
  pressure: number | null;
  windSpeed: number | null;
}

export interface ChannelComparison {
  channel: string;
  unit: string;
  station: number | null;
  reference: number | null;
  delta: number | null;
  comparable: boolean;
  /** Why the channel is not comparable, when it is not. Never a silent blank. */
  reason?: string;
}

export interface CrossCheckResult {
  status: AgreementStatus;
  comparisons: ChannelComparison[];
  /** Channels that could be compared at all. Zero means REFERENCE_UNAVAILABLE. */
  comparableCount: number;
  interpretation: string;
  pressureLabel: string;
}

function delta(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) * 10) / 10;
}

/**
 * Pressure is comparable only when both sides are on the same datum. MetShield
 * baselines are MSL; a QFE reading from the reference is an altitude artefact,
 * not a weather disagreement, and differencing it would print nonsense.
 */
export function pressureComparable(reference: ReferenceReading): boolean {
  return reference.pressure !== null && reference.pressureDatum === 'MEAN_SEA_LEVEL';
}

function compare(
  channel: string,
  unit: string,
  station: number | null,
  reference: number | null,
  comparable: boolean,
  reason?: string
): ChannelComparison {
  return {
    channel,
    unit,
    station: station !== null && Number.isFinite(station) ? station : null,
    // The reference value is always shown, comparable or not. Hiding it behind
    // a blank would make a QFE row look like a missing measurement.
    reference,
    delta: comparable ? delta(station, reference) : null,
    comparable,
    ...(reason ? { reason } : {}),
  };
}

/**
 * Builds the full cross-check. `reference` null means the fetch failed, timed
 * out, or returned nothing usable — the result is REFERENCE_UNAVAILABLE and no
 * delta is computed, because a delta against a missing number is a fiction.
 */
export function crossCheck(
  station: StationReading | null,
  reference: ReferenceReading | null
): CrossCheckResult {
  const pressureLabel = reference
    ? PRESSURE_DATUM_LABEL[reference.pressureDatum]
    : PRESSURE_DATUM_LABEL.UNKNOWN;

  if (!station || !reference) {
    return {
      status: 'REFERENCE_UNAVAILABLE',
      comparisons: [],
      comparableCount: 0,
      interpretation:
        'Independent reference unavailable. The MetShield QC decision above is unchanged and stands on its own — this panel is advisory only.',
      pressureLabel,
    };
  }

  const pressureOk = pressureComparable(reference);
  const pressureReason = pressureOk
    ? undefined
    : reference.pressure === null
      ? 'Reference reported no pressure value.'
      : `Reference pressure is ${PRESSURE_DATUM_LABEL[reference.pressureDatum]}; MetShield baselines are mean sea level, so the two are not on a common datum.`;

  const comparisons: ChannelComparison[] = [
    compare('Temperature', '°C', station.temperature, reference.temperature, true),
    compare('Humidity', '%', station.relativeHumidity, reference.relativeHumidity, true),
    compare(
      'Pressure',
      'hPa',
      station.pressure,
      reference.pressure,
      pressureOk,
      pressureReason
    ),
    compare('Wind', 'km/h', station.windSpeed, reference.windSpeed, station.windSpeed !== null),
  ];

  const live = comparisons.filter((c) => c.comparable && c.delta !== null);
  const comparableCount = live.length;

  if (comparableCount === 0) {
    return {
      status: 'REFERENCE_UNAVAILABLE',
      comparisons,
      comparableCount: 0,
      interpretation:
        'No channel could be compared with the independent reference. The MetShield QC decision above is unchanged.',
      pressureLabel,
    };
  }

  // Worst exceedance across comparable channels, as a fraction of that
  // channel's tolerance. A single bad channel is enough to downgrade the whole
  // status — the operator is looking for "anything worth a second look".
  const ratio = Math.max(
    ...live.map((c) => {
      const tol =
        c.channel === 'Temperature'
          ? AGREEMENT_TOLERANCE.temperatureC
          : c.channel === 'Humidity'
            ? AGREEMENT_TOLERANCE.humidityPct
            : c.channel === 'Pressure'
              ? AGREEMENT_TOLERANCE.pressureHpa
              : AGREEMENT_TOLERANCE.windKph;
      return Math.abs(c.delta ?? 0) / tol;
    })
  );

  const status: AgreementStatus =
    ratio >= 2 ? 'STRONG_DISAGREEMENT' : ratio >= 1 ? 'MODERATE_DISAGREEMENT' : 'CLOSE_AGREEMENT';

  const worst = live.reduce((a, b) => (Math.abs(b.delta ?? 0) > Math.abs(a.delta ?? 0) ? b : a));

  const interpretation =
    status === 'CLOSE_AGREEMENT'
      ? `Independent reference agrees with the station within tolerance on all ${comparableCount} comparable channel${comparableCount === 1 ? '' : 's'}. No external reason to revisit the QC decision.`
      : status === 'MODERATE_DISAGREEMENT'
        ? `${worst.channel} differs by ${Math.abs(worst.delta ?? 0)} ${worst.unit}, beyond the advisory tolerance. A point station and a gridded model often disagree by this much; it is not by itself evidence of a transducer fault.`
        : `${worst.channel} differs by ${Math.abs(worst.delta ?? 0)} ${worst.unit} — a large gap for this pair. Worth a look at the station log, but this layer does not adjudicate: the QC decision above is the one that counts.`;

  return { status, comparisons, comparableCount, interpretation, pressureLabel };
}

/** Uppercase label for the status chip. */
export const STATUS_LABEL: Record<AgreementStatus, string> = {
  CLOSE_AGREEMENT: 'CLOSE AGREEMENT',
  MODERATE_DISAGREEMENT: 'MODERATE DISAGREEMENT',
  STRONG_DISAGREEMENT: 'STRONG DISAGREEMENT',
  REFERENCE_UNAVAILABLE: 'REFERENCE UNAVAILABLE',
};
