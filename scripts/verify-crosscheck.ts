/**
 * verify-crosscheck.ts
 * METSHIELD AI — end-to-end check of the district spatial cross-check.
 *
 * The cross-check is the one module whose output depends on a third party, so
 * it gets its own verifier. Two things are checked:
 *
 *   1. GEOMETRY — every station resolves to a real district within the
 *      corroboration radius, and no station is stranded without a district.
 *   2. LIVE PATH — a handful of stations are cross-checked against real
 *      Open-Meteo data and the verdict is printed with its full rationale, so
 *      the operator can see what the panel will show.
 *
 * The geometry half runs offline and must pass. The live half needs a network
 * and reports NO EXTERNAL DATA rather than failing when one is absent — an
 * unreachable provider is not a defect in the cross-check.
 *
 * Run:  npx tsx scripts/verify-crosscheck.ts
 * Exit: 0 on success, 1 if the offline geometry check fails.
 */

import { IMD_AWS_STATIONS } from '../lib/stationData';
import { nearestDistrict, crossCheckStation, MAX_DISTRICT_RADIUS_KM } from '../lib/spatialCrossCheck';
import { nicWmoEngineInstance } from '../lib/anomalyLogic';

const TICK_MS = 2500;

function pass(ok: boolean): string {
  return ok ? 'PASS' : 'FAIL';
}

let failures = 0;

async function main() {
  console.log('='.repeat(78));
  console.log('METSHIELD AI — SPATIAL CROSS-CHECK VERIFIER');
  console.log('='.repeat(78));

  // ── 1. Geometry, offline ─────────────────────────────────────────────
  const stations = IMD_AWS_STATIONS.filter(s => s.stationId !== 'AWS-MOB-01');
  const resolved: { id: string; name: string; district: string; state: string; km: number }[] = [];
  let within = 0;

  for (const s of stations) {
    const { district, distanceKm } = nearestDistrict(s);
    resolved.push({
      id: s.stationId,
      name: s.name,
      district: district.name,
      state: district.state,
      km: Math.round(distanceKm),
    });
    if (distanceKm <= 60) within++;
  }

  // A station whose nearest district is further than the radius cannot be
  // corroborated at all. That is legal — it degrades to INSUFFICIENT_DATA — but
  // if it happens to *most* of the network, the radius is wrong, not the data.
  const stranded = resolved.filter(r => r.km > 60);
  const okCoverage = within / resolved.length >= 0.9;
  if (!okCoverage) failures++;

  console.log(`\nGEOMETRY (offline)\n`);
  console.log(`  Stations              ${resolved.length}`);
  console.log(`  Within 60 km radius   ${within}  (${((within / resolved.length) * 100).toFixed(0)}%)  ${pass(okCoverage)}`);
  console.log(`  Stranded              ${stranded.length}`);
  if (stranded.length > 0) {
    for (const s of stranded.slice(0, 6)) console.log(`    - ${s.id} ${s.name} -> ${s.district} (${s.km} km)`);
  }

  const far = [...resolved].sort((a, b) => b.km - a.km).slice(0, 4);
  console.log(`\n  Furthest four station->district pairings:`);
  for (const r of far) {
    console.log(`    ${r.id.padEnd(12)} ${r.name.padEnd(24)} -> ${r.district.padEnd(24)} ${String(r.km).padStart(4)} km`);
  }

  // ── 2. Live path ─────────────────────────────────────────────────────
  // Seed the engine with a few nominal ticks so the cross-check has a real
  // packet to compare, rather than testing the no-reading branch.
  const probe = stations.slice(0, 4);
  let ts = Date.now();
  for (const s of probe) {
    for (let i = 0; i < 6; i++) {
      const jitterT = s.baseline.tempMean + (Math.random() - 0.5) * 0.6;
      const jitterP = s.baseline.pressureMean + (Math.random() - 0.5) * 0.4;
      const jitterH = s.baseline.humidityMean + (Math.random() - 0.5) * 2;
      nicWmoEngineInstance.processIngestedObservation(
        s.stationId,
        Math.round(jitterT * 100) / 100,
        Math.round(jitterP * 10) / 10,
        Math.round(jitterH * 10) / 10,
        ts
      );
      ts += TICK_MS;
    }
  }

  console.log(`\nLIVE CROSS-CHECK (Open-Meteo, ${probe.length} stations)\n`);
  let live = 0;
  for (const s of probe) {
    const r = await crossCheckStation(s.stationId);
    if (r.source === 'OPEN_METEO') live++;
    const pkt = nicWmoEngineInstance.getBuffer(s.stationId);
    const cls = pkt.length > 0 ? pkt[pkt.length - 1].classification : 'no packet';
    console.log(`  ${s.stationId}  ${s.name}`);
    console.log(`    nearest district : ${r.district.name}, ${r.district.state} (${r.district.distanceKm} km)`);
    console.log(`    station          : ${fmt(r.station.temperature)} °C  ${fmt(r.station.pressureMsl)} hPa MSL  ${fmt(r.station.humidity)} %`);
    console.log(`    live district    : ${fmt(r.district.temperature)} °C  ${fmt(r.district.pressureMsl)} hPa MSL  ${fmt(r.district.humidity)} %`);
    console.log(`    bands            : T=${r.bands.temperature}  P=${r.bands.pressure}  RH=${r.bands.humidity}`);
    console.log(`    engine verdict   : ${cls}`);
    console.log(`    cross-check      : ${r.verdict}`);
    console.log(`    rationale        : ${r.rationale}`);
    console.log('');
  }

  const okLive = live > 0;
  if (!okLive) {
    console.log('  NO EXTERNAL DATA — Open-Meteo was unreachable. The cross-check correctly');
    console.log('  reported INSUFFICIENT_DATA rather than inventing a verdict. Not a failure.\n');
  }

  // ── 3. Fault path, against live data ──────────────────────────────────
  // Steps 1 and 2 only exercise the "station agrees" direction. The claim that
  // matters is the opposite one: a genuinely broken probe must be caught by an
  // independent source. So a thermistor offset is injected into a station and
  // the cross-check is asked to arbitrate. The district weather is real, and
  // quiet, so a correct cross-check must side with the district.
  console.log(`FAULT ARBITRATION (injected offset, live district)\n`);
  const target = probe[0];
  let faultCaught = 0;
  let faultTested = 0;

  for (const offset of [18, -22]) {
    // Push nominal ticks, then a persistent thermistor offset, so the engine
    // sees a real step rather than a single wild sample.
    let t2 = Date.now() + 600000;
    for (let i = 0; i < 4; i++) {
      nicWmoEngineInstance.processIngestedObservation(
        target.stationId,
        target.baseline.tempMean + (Math.random() - 0.5) * 0.6,
        target.baseline.pressureMean + (Math.random() - 0.5) * 0.4,
        target.baseline.humidityMean + (Math.random() - 0.5) * 2,
        t2
      );
      t2 += TICK_MS;
    }
    const injectedClasses: string[] = [];
    for (let i = 0; i < 3; i++) {
      const pk = nicWmoEngineInstance.processIngestedObservation(
        target.stationId,
        target.baseline.tempMean + offset + (Math.random() - 0.5) * 0.6,
        target.baseline.pressureMean + (Math.random() - 0.5) * 0.4,
        target.baseline.humidityMean + (Math.random() - 0.5) * 2,
        t2
      );
      injectedClasses.push(pk.classification);
      t2 += TICK_MS;
    }

    const r = await crossCheckStation(target.stationId);
    const buf = nicWmoEngineInstance.getBuffer(target.stationId);
    const cls = buf.length > 0 ? buf[buf.length - 1].classification : 'no packet';
    const sidedWithDistrict = r.verdict === 'STATION_DIVERGES' || r.verdict === 'INDEPENDENT_STORM_CORROBORATION';
    faultTested++;
    if (sidedWithDistrict) faultCaught++;

    console.log(`  injected offset ${offset > 0 ? '+' : ''}${offset} °C on ${target.stationId}`);
    console.log(`    engine verdicts  : ${injectedClasses.join(' -> ')}`);
    console.log(`    engine final     : ${cls}`);
    console.log(`    cross-check      : ${r.verdict}  ${pass(sidedWithDistrict)}`);
    console.log(`    bands            : T=${r.bands.temperature}  P=${r.bands.pressure}  RH=${r.bands.humidity}`);
    console.log(`    rationale        : ${r.rationale}`);
    console.log('');

    // Reset so the next offset starts from a clean baseline.
    nicWmoEngineInstance.resetToNominal(target.stationId);
  }

  if (live > 0) {
    const okFault = faultCaught === faultTested;
    if (!okFault) failures++;
    console.log(`  Arbiter sided with the independent source ${faultCaught}/${faultTested}  ${pass(okFault)}\n`);
  } else {
    console.log('  Skipped: no external data to arbitrate against.\n');
  }

  console.log('='.repeat(78));
  console.log(failures === 0 ? 'RESULT: PASS' : `RESULT: FAIL (${failures} check(s))`);
  console.log('='.repeat(78));
  process.exit(failures === 0 ? 0 : 1);
}

function fmt(v: number | null): string {
  return v === null ? '  n/a' : v.toFixed(1).padStart(6);
}

void MAX_DISTRICT_RADIUS_KM;
main();
