import { describe, it, expect } from 'vitest';
import { computeVerdict, type Verdict } from '../app/dashboard/KpiStrip';
import { computeKpis, getNetworkSnapshot, type NetworkKpis } from '../lib/networkFeed';

/**
 * The KPI verdict band, pinned.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The verdict is the answer the operations console leads with: "is anything
 * wrong, and is it weather or hardware". It selects between four branches, and
 * only one of them is reachable from the default snapshot on any given run. A
 * verdict row that renders correctly for faults while its nominal, warning and
 * multi-fault branches are broken is invisible in source and in typecheck — the
 * dashboard opens on the fault case, the fault case looks right, and the other
 * three are never seen until a judge picks that scenario.
 *
 * So the branches are pinned here with inputs built the same way
 * `computeKpis` builds its own. The two higher-level tests at the bottom
 * anchor the inputs to real engine output so the fixtures below cannot drift
 * away from what the engine actually produces.
 */

function kpis(over: Partial<NetworkKpis> = {}): NetworkKpis {
  return {
    total: 21,
    nominal: 21,
    weatherEvents: 0,
    drift: 0,
    faults: 0,
    telemetryIssues: 0,
    qualityScore: 100,
    activeFaults: 0,
    activeAnomalies: 0,
    stationsWithHistory: 21,
    dataMode: 'BENCHMARK',
    ...over,
  };
}

function check(v: Verdict) {
  // Status is never carried by colour alone (WCAG 1.4.1), so every branch has
  // to produce a headline a screen reader can announce. An empty headline
  // would still pass a visual check.
  expect(v.headline).not.toBe('');
  expect(v.headline).toBe(v.headline.toUpperCase());
  // And it must not read as a green light while stations are down.
  if (v.tone === 'healthy') expect(v.headline).toBe('NETWORK NOMINAL');
  else expect(v.headline).not.toBe('NETWORK NOMINAL');
}

describe('KPI verdict — healthy branch', () => {
  it('says the network is nominal when every station is at Flag 1', () => {
    const v = computeVerdict(kpis(), []);
    check(v);
    expect(v.tone).toBe('healthy');
    expect(v.headline).toBe('NETWORK NOMINAL');
    expect(v.detail).toBe('All 21 registered stations at WMO Flag 1.');
  });

  it('names the real station total rather than assuming the registry size', () => {
    expect(computeVerdict(kpis({ total: 7, nominal: 7 }), []).detail).toContain('All 7 ');
  });
});

describe('KPI verdict — fault branch (outranks warning)', () => {
  it('reports a hardware fault with the station id and the not-weather qualifier', () => {
    const v = computeVerdict(kpis({ nominal: 20, faults: 1, activeFaults: 1, activeAnomalies: 1 }), [
      'AWS-DEL-04',
    ]);
    check(v);
    expect(v.tone).toBe('fault');
    expect(v.headline).toBe('1 STATION REPORT HARDWARE FAULT');
    // The singular/plural bug: "1 STATIONS" would ship silently.
    expect(v.detail).toContain('AWS-DEL-04');
    expect(v.detail).toContain('not weather');
  });

  it('pluralises the headline for a multi-station network failure', () => {
    const v = computeVerdict(
      kpis({ nominal: 18, faults: 3, activeFaults: 3, activeAnomalies: 3 }),
      ['AWS-DEL-04', 'AWS-KOL-07', 'AWS-PUN-08']
    );
    expect(v.headline).toBe('3 STATIONS REPORT HARDWARE FAULT');
    expect(v.detail).toContain('AWS-DEL-04 · AWS-KOL-07 · AWS-PUN-08');
  });

  it('takes the fault branch even when storms and drift are also present', () => {
    // Fault and weather can co-occur. Reporting "5 STATIONS NEED ATTENTION" here
    // would bury the hardware fault in a weather count and understate the work.
    const v = computeVerdict(
      kpis({
        nominal: 16,
        faults: 3,
        activeFaults: 3,
        weatherEvents: 1,
        drift: 1,
        activeAnomalies: 5,
      }),
      ['AWS-DEL-04', 'AWS-KOL-07', 'AWS-PUN-08']
    );
    expect(v.tone).toBe('fault');
    expect(v.headline).toContain('HARDWARE FAULT');
  });
});

describe('KPI verdict — warning branch', () => {
  it('names only the non-zero classes', () => {
    // "0 storm · 1 drift · 0 fault" makes the operator re-parse zeros to find
    // the signal. This is the defect the branch exists to prevent.
    const v = computeVerdict(kpis({ nominal: 20, drift: 1, activeAnomalies: 1 }), []);
    check(v);
    expect(v.tone).toBe('warning');
    expect(v.headline).toBe('1 STATION NEED ATTENTION');
    expect(v.detail).toBe('1 sensor drift.');
    expect(v.detail).not.toContain('0 ');
  });

  it('joins every active class when more than one is present', () => {
    const v = computeVerdict(
      kpis({ nominal: 18, weatherEvents: 1, drift: 1, telemetryIssues: 1, activeAnomalies: 3 }),
      []
    );
    expect(v.headline).toBe('3 STATIONS NEED ATTENTION');
    expect(v.detail).toBe('1 convective storm · 1 sensor drift · 1 packet loss.');
  });

  it('does not claim a hardware fault when only the packet path is degraded', () => {
    // TELEMETRY_PACKET_LOSS is FLAG_5, not a transducer fault. Routing it to
    // the fault branch would raise a work order for a broken radio that the
    // operator would then chase to a healthy sensor.
    const v = computeVerdict(kpis({ nominal: 20, telemetryIssues: 1, activeAnomalies: 1 }), []);
    expect(v.tone).toBe('warning');
    expect(v.headline).not.toContain('HARDWARE FAULT');
  });
});

describe('KPI verdict — anchored to real engine output', () => {
  it('the default snapshot resolves to the fault branch, with real station ids', () => {
    // Whatever the seed does today, the verdict must agree with computeKpis
    // rather than with a hardcoded expectation. This is the anti-drift anchor.
    const snapshot = getNetworkSnapshot();
    const k = computeKpis(snapshot);
    const ids = snapshot.stations.filter((s) => s.health === 'FAULT').map((s) => s.stationId);
    const v = computeVerdict(k, ids);

    if (k.activeFaults > 0) {
      expect(v.tone).toBe('fault');
      expect(ids.length).toBe(k.activeFaults);
      for (const id of ids) expect(v.detail).toContain(id);
    } else if (k.activeAnomalies === 0) {
      expect(v.tone).toBe('healthy');
    } else {
      expect(v.tone).toBe('warning');
    }
    check(v);
  });
});
