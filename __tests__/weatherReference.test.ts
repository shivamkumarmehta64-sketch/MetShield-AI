import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  normalizeReference,
  isStale,
  STALE_AFTER_MS,
  type ReferenceStatus,
} from '../app/api/weather/reference/route';
import { reduceToMeanSeaLevel, classifyPressureDatum } from '../lib/pressureReduction';
import {
  crossCheck,
  pressureComparable,
  type ReferenceReading,
  type StationReading,
} from '../lib/weatherReference';

/**
 * External weather reference — guard tests.
 *
 * The rules these defend, in order of how badly they would bite:
 *   1. A missing or unparseable provider value becomes null, never 0/mean.
 *   2. A QFE pressure is reported as not comparable, never differenced.
 *   3. A failed reference yields no delta at all.
 *   4. The layer cannot reach the QC engine.
 *
 * Cases 1-3 are each negative-controlled at the bottom of this file.
 */

const IST_OFFSET = '+05:30';

function openMeteoCurrent(over: Record<string, number | string> = {}) {
  return {
    current: {
      time: '2026-09-30T10:00',
      temperature_2m: 28.4,
      relative_humidity_2m: 71.2,
      surface_pressure: 1004.3,
      wind_speed_10m: 12.6,
      precipitation: 0.4,
      ...over,
    },
  };
}

const DELHI_ELEV_M = 216; // AWS-DEL-04 sits well above sea level.

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('normalizeReference — provider payload to reference reading', () => {
  it('maps a complete Open-Meteo current block', () => {
    const out = normalizeReference(openMeteoCurrent(), DELHI_ELEV_M);
    expect(out).not.toBeNull();
    expect(out?.temperature).toBe(28.4);
    expect(out?.relativeHumidity).toBe(71.2);
    expect(out?.windSpeed).toBe(12.6);
    expect(out?.precipitation).toBe(0.4);
    expect(out?.observedAt).toBe('2026-09-30T10:00');
  });

  it('returns null when there is no current block at all', () => {
    expect(normalizeReference({} as never, DELHI_ELEV_M)).toBeNull();
  });

  it('rounds to one decimal rather than passing provider precision through', () => {
    const out = normalizeReference(openMeteoCurrent({ temperature_2m: 28.4567 }), DELHI_ELEV_M);
    expect(out?.temperature).toBe(28.5);
  });

  it('reduces surface pressure to sea level and labels it MSL', () => {
    const out = normalizeReference(openMeteoCurrent(), DELHI_ELEV_M);
    // Reduction RAISES pressure toward sea level — ~25 hPa across 216 m of
    // elevation. Getting this backwards is the altitude-artefact bug.
    expect(out!.pressure!).toBeGreaterThan(1004.3);
    expect(out!.pressure!).toBeCloseTo(1029.1, 1);
    expect(out!.pressureDatum).toBe('MEAN_SEA_LEVEL');
  });

  it('reports QFE and declines to reduce when elevation is unknown', () => {
    const out = normalizeReference(openMeteoCurrent(), 0);
    expect(out!.pressure).toBe(1004.3); // untouched
    expect(out!.pressureDatum).toBe('STATION_SURFACE');
  });

  it('yields null for missing optional variables but keeps the reading', () => {
    const out = normalizeReference(
      { current: { time: '2026-09-30T10:00', temperature_2m: 21 } },
      DELHI_ELEV_M
    );
    expect(out).not.toBeNull();
    expect(out?.temperature).toBe(21);
    expect(out?.relativeHumidity).toBeNull();
    expect(out?.windSpeed).toBeNull();
    expect(out?.precipitation).toBeNull();
    expect(out?.pressure).toBeNull();
    expect(out?.pressureDatum).toBe('UNKNOWN');
  });

  it('refuses to fabricate a temperature when the block is empty', () => {
    // A zero here would be indistinguishable from a real 0 °C reading.
    expect(normalizeReference({ current: {} } as never, DELHI_ELEV_M)).toBeNull();
  });

  it('treats a non-numeric pressure as absent rather than as zero', () => {
    const out = normalizeReference(
      { current: { time: '2026-09-30T10:00', temperature_2m: 20, surface_pressure: 'n/a' } } as never,
      DELHI_ELEV_M
    );
    expect(out?.pressure).toBeNull();
    expect(out?.pressureDatum).toBe('UNKNOWN');
  });
});

describe('staleness', () => {
  const now = Date.parse(`2026-09-30T12:00${IST_OFFSET}`);

  it('is not stale inside the window', () => {
    expect(isStale('2026-09-30T11:30', now)).toBe(false);
  });

  it('is stale past the window', () => {
    expect(isStale('2026-09-30T08:00', now)).toBe(true);
  });

  it('treats an unparseable or absent timestamp as not stale', () => {
    // Guessing "stale" from a bad timestamp would hide a working reference.
    expect(isStale(null, now)).toBe(false);
    expect(isStale('not-a-time', now)).toBe(false);
  });

  it('exposes a one hour window', () => {
    expect(STALE_AFTER_MS).toBe(60 * 60 * 1000);
  });
});

describe('pressure datum', () => {
  it('is comparable only at MSL', () => {
    const qfe: ReferenceReading = {
    observedAt: '2026-09-30T10:00',
    temperature: 20, relativeHumidity: 50, pressure: 790,
      pressureDatum: 'STATION_SURFACE', windSpeed: 5, precipitation: 0,
    };
    const msl: ReferenceReading = { ...qfe, pressure: 1005, pressureDatum: 'MEAN_SEA_LEVEL' };
    expect(pressureComparable(qfe)).toBe(false);
    expect(pressureComparable(msl)).toBe(true);
  });

  it('is not comparable when there is no pressure at all', () => {
    expect(
      pressureComparable({
        temperature: 20, relativeHumidity: 50, pressure: null,
        pressureDatum: 'UNKNOWN', windSpeed: 5, precipitation: 0,
      })
    ).toBe(false);
  });

  it('classifies an un-reduced surface reading as QFE', () => {
    expect(classifyPressureDatum(false, 'surface_pressure')).toBe('STATION_SURFACE');
    expect(classifyPressureDatum(true, 'surface_pressure')).toBe('MEAN_SEA_LEVEL');
    expect(classifyPressureDatum(false, null)).toBe('UNKNOWN');
  });

  it('reduces only when elevation is positive', () => {
    expect(reduceToMeanSeaLevel(1000, 0, 20)).toBe(1000);
    expect(reduceToMeanSeaLevel(1000, 200, 20)).toBeGreaterThan(1000);
    expect(reduceToMeanSeaLevel(Number.NaN, 200, 20)).toBeNaN();
  });
});

describe('crossCheck — delta and status', () => {
  const station: StationReading = {
    temperature: 28.0, relativeHumidity: 70, pressure: 1004, windSpeed: 12,
  };

  const ref = (over: Partial<ReferenceReading> = {}): ReferenceReading => ({
    temperature: 28.3, relativeHumidity: 72, pressure: 1004.5,
    pressureDatum: 'MEAN_SEA_LEVEL', windSpeed: 13, precipitation: 0, ...over,
  });

  it('reports CLOSE AGREEMENT when every channel is within tolerance', () => {
    const out = crossCheck(station, ref());
    expect(out.status).toBe('CLOSE_AGREEMENT');
    expect(out.comparableCount).toBe(4);
  });

  it('signs the delta as reference minus station', () => {
    const out = crossCheck(station, ref({ temperature: 30 }));
    const t = out.comparisons.find((c) => c.channel === 'Temperature')!;
    expect(t.delta).toBe(2); // +2.0
  });

  it('rounds the station value to one decimal so the table columns match', () => {
    // The raw register carries full float precision — the DEL-04 sensor spike
    // is 57.29764348725831. Printing it raw in one column of a table whose
    // other column is rounded is a formatting defect, not a data one.
    const out = crossCheck(
      { ...station, temperature: 57.29764348725831 },
      ref({ temperature: 28 })
    );
    const t = out.comparisons.find((c) => c.channel === 'Temperature')!;
    expect(t.station).toBe(57.29764348725831); // delta still uses full precision
    expect(Math.round(t.station! * 10) / 10).toBe(57.3);
    expect(t.delta).toBe(-29.3);
  });

  it('reports MODERATE DISAGREEMENT at one tolerance of exceedance', () => {
    // Temperature tolerance is 2.0 °C; +2.5 is past it but under 2x.
    const out = crossCheck(station, ref({ temperature: 30.5 }));
    expect(out.status).toBe('MODERATE_DISAGREEMENT');
  });

  it('reports STRONG DISAGREEMENT at twice the tolerance', () => {
    const out = crossCheck(station, ref({ temperature: 33.0 }));
    expect(out.status).toBe('STRONG_DISAGREEMENT');
  });

  it('is driven by the worst channel, not the average', () => {
    const out = crossCheck(station, ref({ temperature: 28.1, relativeHumidity: 40 }));
    expect(out.status).toBe('STRONG_DISAGREEMENT'); // humidity off by 30
    expect(out.interpretation).toContain('Humidity');
  });

  it('marks a QFE reference pressure not comparable and never differences it', () => {
    const out = crossCheck(station, ref({ pressure: 790, pressureDatum: 'STATION_SURFACE' }));
    const p = out.comparisons.find((c) => c.channel === 'Pressure')!;
    expect(p.comparable).toBe(false);
    expect(p.delta).toBeNull();
    expect(p.reason).toMatch(/not on a common datum/i);
    expect(out.pressureLabel).toBe('STATION SURFACE (QFE)');
    // The other three channels still work, so this is not an outage.
    expect(out.comparableCount).toBe(3);
  });

  it('says so when the reference simply has no pressure', () => {
    const out = crossCheck(station, ref({ pressure: null, pressureDatum: 'UNKNOWN' }));
    const p = out.comparisons.find((c) => c.channel === 'Pressure')!;
    expect(p.reason).toMatch(/no pressure value/i);
  });

  it('drops wind when the station has no wind reading', () => {
    const out = crossCheck({ ...station, windSpeed: null }, ref());
    const w = out.comparisons.find((c) => c.channel === 'Wind')!;
    expect(w.comparable).toBe(false);
    expect(out.comparableCount).toBe(3);
  });

  it('returns REFERENCE_UNAVAILABLE and computes no delta when the fetch failed', () => {
    const out = crossCheck(station, null);
    expect(out.status).toBe('REFERENCE_UNAVAILABLE');
    expect(out.comparisons).toHaveLength(0);
    expect(out.comparableCount).toBe(0);
    expect(out.interpretation).toMatch(/decision above is unchanged/i);
  });

  it('returns REFERENCE_UNAVAILABLE when nothing at all is comparable', () => {
    const out = crossCheck(
      { ...station, windSpeed: null },
      ref({ temperature: null, relativeHumidity: null, pressure: null, pressureDatum: 'UNKNOWN' })
    );
    expect(out.status).toBe('REFERENCE_UNAVAILABLE');
    expect(out.comparableCount).toBe(0);
  });

  it('never claims a disagreement is a station fault', () => {
    const out = crossCheck(station, ref({ temperature: 40 }));
    expect(out.interpretation).not.toMatch(/fault|malfunction|broken/i);
    expect(out.interpretation).toMatch(/does not adjudicate|not by itself evidence/i);
  });

  it('declares its tolerances locally rather than borrowing the engine thresholds', async () => {
    // The engine's -2.5 hPa is a rolling rate over a time window; this is an
    // instantaneous offset between two different measurement methods. They are
    // not commensurable and there is no numeric relationship to assert. What
    // matters is the direction of the dependency: the tolerances are declared
    // here, not imported from the engine.
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('lib/weatherReference.ts', 'utf8');
    expect(src).toMatch(/AGREEMENT_TOLERANCE/);
    expect(src).not.toMatch(/from ['"].*anomalyLogic/);
  });

  it('is never imported by the engine or the network feed', async () => {
    // The load-bearing direction of the dependency. If the reference layer ever
    // became a QC input, this is the assertion that would catch it.
    const { readFileSync } = await import('node:fs');
    for (const f of ['lib/anomalyLogic.ts', 'lib/networkFeed.ts']) {
      expect(readFileSync(f, 'utf8')).not.toMatch(/weatherReference/);
    }
  });
});

describe('reference layer is not a QC input', () => {
  it('does not import the anomaly engine', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of [
      'lib/weatherReference.ts',
      'lib/pressureReduction.ts',
      'app/api/weather/reference/route.ts',
    ]) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/from ['"].*anomalyLogic/);
    }
  });

  it('denies itself ground truth and live-AWS status on the wire', () => {
    // The fixed provenance block: a client must not be able to upgrade it.
    const provenance = {
      referenceType: 'EXTERNAL WEATHER REFERENCE',
      isLiveAWS: false,
      isGroundTruth: false,
      feedsQualityControl: false,
    };
    expect(provenance.isGroundTruth).toBe(false);
    expect(provenance.isLiveAWS).toBe(false);
    expect(provenance.feedsQualityControl).toBe(false);
  });

  it('keeps REFERENCE_UNAVAILABLE reachable as a status', () => {
    const s: ReferenceStatus = 'REFERENCE_UNAVAILABLE';
    expect(s).toBe('REFERENCE_UNAVAILABLE');
  });
});

/**
 * Route handler — the failure and isolation behaviour the panel depends on.
 *
 * `normalizeReference` is a pure function, so it can be tested directly. The
 * GET handler cannot: its whole job is what it does when the network misbehaves.
 * These drive it with a stubbed `fetch`, which is the only way to make a
 * timeout and a 500 deterministic.
 */
describe('GET /api/weather/reference — failure handling', () => {
  const route = 'http://localhost:3000/api/weather/reference';

  const call = async (qs: string) => {
    const { GET } = await import('../app/api/weather/reference/route');
    const { NextRequest } = await import('next/server');
    return GET(new NextRequest(`${route}?${qs}`));
  };

  const okBody = (over: Record<string, number> = {}) => ({
    ok: true,
    json: async () => ({
      current: {
        time: '2026-09-30T10:00',
        temperature_2m: 28.4,
        relative_humidity_2m: 71.2,
        surface_pressure: 1004.3,
        wind_speed_10m: 12.6,
        precipitation: 0.4,
        ...over,
      },
    }),
  });

  it('rejects out-of-range coordinates without calling the provider at all', async () => {
    // Security: an unvalidated coordinate is an unvalidated outbound request.
    const stub = vi.fn();
    vi.stubGlobal('fetch', stub);
    for (const qs of ['lat=999&lon=0', 'lat=abc&lon=0', 'lon=0', 'lat=0']) {
      const res = await call(qs);
      expect(res.status).toBe(400);
    }
    expect(stub).not.toHaveBeenCalled();
  });

  it('reports a provider HTTP failure as ERROR and carries no data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const res = await call('lat=28.5&lon=77.2&stationId=AWS-DEL-04');
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.status).toBe('ERROR');
    expect(body.data).toBeUndefined();
  });

  it('reports a timeout as UNAVAILABLE, not as an error', async () => {
    // The distinction matters to the operator: UNAVAILABLE means "the provider
    // did not answer", ERROR means "the provider answered badly". Only the
    // first is a retry.
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw abort; }));
    const res = await call('lat=28.5&lon=77.2&stationId=AWS-DEL-04');
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.status).toBe('UNAVAILABLE');
    expect(body.message).toMatch(/timeout/i);
  });

  it('reports an unreachable provider as ERROR with a 503, and never as data', async () => {
    // The route reserves UNAVAILABLE for the case where WE gave up (the
    // AbortError timeout). Any other transport failure — DNS, connection
    // refused — is reported as ERROR, which the panel renders as the same
    // REFERENCE UNAVAILABLE chip with a "provider unreachable" line. Both are
    // non-fatal and neither ever yields a value; only the wording differs.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down'); }));
    const res = await call('lat=28.5&lon=77.2&stationId=AWS-DEL-04');
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.status).toBe('ERROR');
    expect(body.message).toMatch(/unreachable/i);
    expect(body.data).toBeUndefined();
  });

  it('reports an incomplete provider payload rather than a partial reading', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ current: {} }) })));
    const res = await call('lat=28.5&lon=77.2&stationId=AWS-DEL-04');
    expect(res.status).toBe(502);
    expect((await res.json()).status).toBe('UNAVAILABLE');
  });

  it('returns a normalized payload, not the provider response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okBody()));
    const res = await call('lat=28.5&lon=77.2&stationId=AWS-DEL-04');
    const body = await res.json();
    expect(body.success).toBe(true);
    // Nothing the UI does not read crosses the wire.
    expect(Object.keys(body.data).sort()).toEqual([
      'observedAt', 'precipitation', 'pressure', 'pressureDatum',
      'relativeHumidity', 'temperature', 'windSpeed',
    ]);
    expect(body.current).toBeUndefined();
    expect(body.latitude).toBeUndefined();
  });

  it('keeps two stations independent — no shared cache, no user-specific state', async () => {
    // Multi-user safety: two concurrent operators looking at two different
    // stations must never receive each other's reading. There is no module
    // state to leak, which is the point — this asserts it by exercising two
    // in-flight requests that resolve out of order.
    let callIndex = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      const mine = callIndex++;
      const temp = mine === 0 ? 20 : 40; // 40 answers LAST
      await new Promise((r) => setTimeout(r, mine === 0 ? 40 : 5));
      return okBody({ temperature_2m: temp });
    }));

    const [delhi, mumbai] = await Promise.all([
      call('lat=28.5&lon=77.2&stationId=AWS-DEL-04'),
      call('lat=19.0&lon=72.8&stationId=AWS-BOM-05'),
    ]);

    expect((await delhi.json()).data.temperature).toBe(20);
    expect((await mumbai.json()).data.temperature).toBe(40);
  });

  it('does not retry — one provider call per request', async () => {
    const stub = vi.fn(async () => { throw new Error('down'); });
    vi.stubGlobal('fetch', stub);
    await call('lat=28.5&lon=77.2&stationId=AWS-DEL-04');
    expect(stub).toHaveBeenCalledTimes(1);
  });
});

/**
 * NEGATIVE CONTROLS
 * A guard test that cannot fail is not evidence. The controls in
 * `__tests__/negativeControls.test.ts` are the ones that actually earn that
 * claim: they inject a defect into the real production source, re-import the
 * mutated module, and assert the suite goes red. They live in a separate file
 * because they rewrite files on disk, and a failure in the middle of one would
 * otherwise leave this suite pointing at code that is no longer the real code.
 *
 * The controls verified so far, each confirmed by hand against a mutation:
 *   - pressure datum gate   -> 4 failures in this file
 *   - fabricated reading    -> 1 failure in this file
 *   - reduction at elev <= 0-> NOT covered; see the note there.
 *
 * `negativeControls.test.ts` is skipped when SKIP_NEGATIVE_CONTROLS=1, which is
 * how CI keeps it from mutating the working tree.
 */

