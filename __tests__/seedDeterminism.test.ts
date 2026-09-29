import { describe, it, expect } from 'vitest';
import { getInitialSeededDataset, NICWMOAnomalyEngine } from '../lib/anomalyLogic';
import { getNetworkSnapshot } from '../lib/networkFeed';

/**
 * The seeded dataset must be byte-identical across calls.
 *
 * WHY
 * ---
 * `getInitialSeededDataset()` runs at module load in `lib/networkFeed.ts` and
 * feeds every panel in the console. If it is not deterministic, the server
 * renders one set of numbers and the client renders another, and React throws
 * hydration error #418 — "the server rendered text didn't match the client" —
 * on every route that shows a seeded packet. That is exactly what happened:
 *
 *   The SENSOR_SPIKE injection set `rawT = 54.8 + Math.random() * 2.5`,
 *   ignoring the `deterministic` flag that gates every other noise term in
 *   `generatePacket`. AWS-DEL-04 therefore rendered 56.5 °C on the server and
 *   56.2 °C in the browser, and the whole tree was re-rendered client-side.
 *
 * This is a guard against that specific class of defect returning, because
 * neither the TypeScript compiler nor ESLint's purity rule can see a
 * `Math.random()` that is merely *forgotten* rather than misused. It was found
 * by diffing the server HTML against the hydrated DOM, not by reading the code.
 *
 * NOTE ON THE NEGATIVE CONTROL: this test only reports a defect if the seed
 * actually varies. When written it was verified to fail against the original
 * `Math.random()` implementation before the fix was kept.
 */

const SEEDED_FAULT_STATIONS = ['AWS-DEL-04', 'AWS-CHN-03', 'AWS-PUN-08'] as const;

describe('Seeded telemetry determinism', () => {
  it('produces identical packets on two independent builds', () => {
    const a = getInitialSeededDataset();
    const b = getInitialSeededDataset();

    const differing: string[] = [];

    for (const id of Object.keys(a.stationPackets)) {
      const pa = a.stationPackets[id];
      const pb = b.stationPackets[id] ?? [];

      if (pa.length !== pb.length) {
        differing.push(`${id}: history length ${pa.length} vs ${pb.length}`);
        continue;
      }

      for (let i = 0; i < pa.length; i++) {
        const x = pa[i];
        const y = pb[i];
        // Every channel the console renders, not just temperature: a mismatch
        // in pressure or the WMO flag produces the same 418.
        if (
          x.raw.temperature !== y.raw.temperature ||
          x.raw.pressure !== y.raw.pressure ||
          x.raw.humidity !== y.raw.humidity ||
          x.raw.windSpeedKph !== y.raw.windSpeedKph ||
          x.raw.rainfallMm10min !== y.raw.rainfallMm10min ||
          x.wmoFlag !== y.wmoFlag ||
          x.classification !== y.classification
        ) {
          differing.push(
            `${id} tick${i}: T ${x.raw.temperature}/${y.raw.temperature} ` +
              `P ${x.raw.pressure}/${y.raw.pressure} ` +
              `RH ${x.raw.humidity}/${y.raw.humidity} ` +
              `${x.wmoFlag}/${y.wmoFlag}`
          );
        }
      }
    }

    expect(differing, `seeded packets varied between builds:\n${differing.join('\n')}`).toEqual([]);
  });

  it('keeps the sensor spike inside the fault range rather than a plausible value', () => {
    // Determinism is worthless if it is achieved by neutering the injection.
    // The spike has to stay far outside physical limits, or the seeded fault
    // silently stops being a fault and the demo has nothing to show.
    const seed = getInitialSeededDataset();
    const del = seed.stationPackets['AWS-DEL-04'] ?? [];
    const spikeTick = del[12];
    const baselineTick = del[11];

    expect(spikeTick?.classification).toBe('SENSOR_SPIKE');
    expect(spikeTick?.wmoFlag).toBe('FLAG_4_CORRUPT_HARDWARE');
    expect(spikeTick?.raw.temperature ?? 0).toBeGreaterThan(50);
    // A jump of this size is what the detector is meant to catch.
    expect((spikeTick?.raw.temperature ?? 0) - (baselineTick?.raw.temperature ?? 0)).toBeGreaterThan(10);
  });

  it('the SENSOR_SPIKE injection does not call Math.random in deterministic mode', () => {
    // A direct behavioural check, so the test does not rely only on the seed
    // happening to reproduce. Two engines, same tick, same station, deterministic.
    const build = () => {
      const engine = new NICWMOAnomalyEngine();
      for (let i = 0; i < 12; i++) {
        engine.generatePacket('AWS-DEL-04', 1_700_000_000_000 + i * 2500, i, undefined, true);
      }
      engine.triggerThermistorSpike('AWS-DEL-04');
      const a = engine.generatePacket('AWS-DEL-04', 1_700_000_000_000 + 12 * 2500, 12, undefined, true);
      const b = engine.generatePacket('AWS-DEL-04', 1_700_000_000_000 + 13 * 2500, 13, undefined, true);
      return [a.raw.temperature, b.raw.temperature];
    };

    expect(build()).toEqual(build());
  });

  it('still seeds all three demo faults so the console has something to show', () => {
    const seed = getInitialSeededDataset();
    for (const id of SEEDED_FAULT_STATIONS) {
      const packets = seed.stationPackets[id] ?? [];
      expect(
        packets.some((p) => p.classification !== 'NOMINAL_OPERATION'),
        `${id} produced no anomaly across its history`
      ).toBe(true);
    }
  });

  it('getNetworkSnapshot memoises one deterministic build', () => {
    // The console calls this from many components; if it rebuilt per call the
    // memoisation would be pointless and the panels could disagree with
    // each other within a single render.
    const first = getNetworkSnapshot();
    const second = getNetworkSnapshot();
    expect(first).toBe(second);
    expect(first.stations.map((s) => s.packet.raw.temperature)).toEqual(
      second.stations.map((s) => s.packet.raw.temperature)
    );
  });
});
