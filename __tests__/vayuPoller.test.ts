import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The background poller's adaptive behaviour.
 *
 * `runPollerCycle` kept two Maps (previousDistrictHealth / offlineRetryCounts)
 * that NOTHING ever wrote. Consequences:
 *   - `lastHealth` was permanently 'LOADING', so the CRITICAL (80) and
 *     DEGRADED (40) priority boosts never fired — every district was queued at
 *     the same background priority of 5.
 *   - `retries` was permanently 0, so the "stop after 3 retries" cutoff for
 *     offline nodes never fired, and unreachable nodes were re-queued forever.
 *
 * Both are now driven by real district health from districtEngine. These tests
 * pin the priority mapping and the backoff/reset behaviour.
 */

// Mock the engine so the cycle is deterministic and observable.
const enqueueDistrictFetch = vi.fn();
const getDistrictHealth = vi.fn<() => string>();

vi.mock('../lib/districtEngine', () => ({
  enqueueDistrictFetch: (id: string, p: number) => enqueueDistrictFetch(id, p),
  getDistrictHealth: (id: string) => getDistrictHealth(id),
  initializeDistrictEngine: () => {},
}));

// Small stand-in for the real registry, so the test does not iterate 710 nodes.
vi.mock('../lib/india766Districts', () => ({
  ALL_766_DISTRICTS: [
    { id: 'D-CRIT', name: 'Critical', state: 'X', lat: 1, lng: 1, population: 1 },
    { id: 'D-DEGR', name: 'Degraded', state: 'X', lat: 1, lng: 1, population: 1 },
    { id: 'D-OK', name: 'Healthy', state: 'X', lat: 1, lng: 1, population: 1 },
    { id: 'D-OFF', name: 'Offline', state: 'X', lat: 1, lng: 1, population: 1 },
  ],
}));

type PollerModule = typeof import('../lib/vayuPoller');

beforeEach(() => {
  enqueueDistrictFetch.mockClear();
  getDistrictHealth.mockReset();
});

async function runOneCycle(mod: PollerModule) {
  // Fake timers must be installed BEFORE startPoller, because that is where
  // setInterval is called — otherwise the interval is real and
  // advanceTimersByTime has nothing to advance.
  vi.useFakeTimers();
  mod.startPoller();
  await vi.advanceTimersByTimeAsync(30_000);
  vi.useRealTimers();
  mod.pausePoller();
}

/** Run n consecutive cycles against a persistent interval. */
async function runCycles(mod: PollerModule, n: number) {
  vi.useFakeTimers();
  mod.startPoller();
  for (let i = 0; i < n; i++) {
    await vi.advanceTimersByTimeAsync(30_000);
  }
  vi.useRealTimers();
  mod.pausePoller();
}

describe('vayuPoller adaptive priority', () => {
  it('prioritises CRITICAL and DEGRADED nodes above background', async () => {
    const mod = await import('../lib/vayuPoller');
    getDistrictHealth.mockImplementation((id: string) => {
      if (id === 'D-CRIT') return 'CRITICAL';
      if (id === 'D-DEGR') return 'DEGRADED';
      if (id === 'D-OFF') return 'OFFLINE';
      return 'HEALTHY';
    });

    await runOneCycle(mod);

    const byId = new Map(enqueueDistrictFetch.mock.calls.map(([id, p]) => [id, p]));
    expect(byId.get('D-CRIT'), 'CRITICAL should outrank everything').toBe(80);
    expect(byId.get('D-DEGR'), 'DEGRADED should outrank background').toBe(40);
    expect(byId.get('D-OK'), 'healthy nodes use background priority').toBe(5);
    // Offline but under the retry limit is retried at raised priority.
    expect(byId.get('D-OFF')).toBe(60);
  });
});

describe('vayuPoller offline backoff', () => {
  it('stops re-queuing a node after the retry limit', async () => {
    const mod = await import('../lib/vayuPoller');
    getDistrictHealth.mockReturnValue('OFFLINE');

    // The counter is module-level, so exercise consecutive cycles.
    await runCycles(mod, 6);

    const offlineCalls = enqueueDistrictFetch.mock.calls.filter(([id]) => id === 'D-OFF');
    // Retried while retries <= limit, then dropped.
    expect(offlineCalls.length).toBeGreaterThan(0);
    expect(offlineCalls.length).toBeLessThan(6);
  });

  it('clears the backoff when a node recovers', async () => {
    const mod = await import('../lib/vayuPoller');
    let healthy = false;
    getDistrictHealth.mockImplementation(() => (healthy ? 'HEALTHY' : 'OFFLINE'));

    vi.useFakeTimers();
    mod.startPoller();
    // Go offline for a few cycles to accumulate retries.
    for (let i = 0; i < 5; i++) await vi.advanceTimersByTimeAsync(30_000);
    enqueueDistrictFetch.mockClear();

    // Recover, then confirm the node is scheduled normally again.
    healthy = true;
    await vi.advanceTimersByTimeAsync(30_000);
    vi.useRealTimers();
    mod.pausePoller();

    const afterRecovery = enqueueDistrictFetch.mock.calls.filter(([id]) => id === 'D-OFF');
    expect(afterRecovery.length).toBeGreaterThan(0);
    expect(afterRecovery[0][1]).toBe(5); // back to background priority
  });
});
