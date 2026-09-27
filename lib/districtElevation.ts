import type { IndiaDistrict } from './india766Districts';

/**
 * District elevation resolution.
 *
 * THE BUG THIS EXISTS TO PREVENT
 * ------------------------------
 * `IndiaDistrict` had no `elevation` field, so two call sites invented one:
 *
 *   lib/districtEngine.ts  ->  elevation: 200        (for every district)
 *   lib/heatwaveEngine.ts  ->  const elev = 200     (for every district)
 *
 * 200 m is roughly sea level. Treating Ladakh's Leh (3,524 m) and Himachal's
 * Shimla (2,205 m) as 200 m meant they were given plains/coastal
 * climatological heatwave normals of 34.5-41.5 °C, and that their barometric
 * and freezing-level checks used a plains atmosphere. The failure is silent:
 * the numbers look reasonable, they are just wrong for the terrain.
 *
 * THE RULE
 * --------
 * An unknown elevation must stay unknown. Callers get `null` and must decide
 * what to do, rather than inheriting a plausible-looking constant that quietly
 * misrepresents the site.
 *
 * Populating `elevation` on every registry record is the real fix. This module makes
 * the interim state explicit and safe rather than pretending 200 m is right.
 */

/** Elevation in metres, or `null` when genuinely unknown. Never guesses. */
export function getDistrictElevation(d: Pick<IndiaDistrict, 'elevation'>): number | null {
  const e = d.elevation;
  if (typeof e !== 'number' || !Number.isFinite(e) || e < 0) return null;
  return e;
}

/**
 * Elevation for climate-zone selection only.
 *
 * Returns `null` when unknown, and the caller MUST treat that as "no terrain
 * adjustment" while making the absence visible in the UI. This is weaker than
 * guessing 200 m, which produced actively wrong normals for mountain districts.
 */
export function getElevationForClimatology(
  d: Pick<IndiaDistrict, 'elevation'>
): number | null {
  return getDistrictElevation(d);
}

/**
 * Broad terrain class from elevation, used to select climatological normals.
 * Returns null when the elevation is unknown.
 */
export function getTerrainClass(
  elevationM: number | null
): 'LOWLAND' | 'PLATEAU' | 'HIGHLAND' | 'ALPINE' | null {
  if (elevationM === null) return null;
  if (elevationM >= 3000) return 'ALPINE';
  if (elevationM >= 1200) return 'HIGHLAND';
  if (elevationM >= 700) return 'PLATEAU';
  return 'LOWLAND';
}

/**
 * True when the elevation is missing, so a surface can say "elevation unknown"
 * instead of presenting a plains-derived figure as authoritative.
 */
export function isElevationUnknown(d: Pick<IndiaDistrict, 'elevation'>): boolean {
  return getDistrictElevation(d) === null;
}
