/**
 * geo.ts — shared geodesy.
 *
 * Extracted from `anomalyLogic.ts` so the district cross-check can do geometry
 * without importing the anomaly engine. The engine itself imports React
 * transitively (via `mlAnomalyModel` → the station data hook re-exports), and
 * pulling that into a lib module used by server and client alike is a needless
 * coupling.
 */

/** Haversine great-circle distance in km between two lat/lon points. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
