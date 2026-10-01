import { describe, it, expect, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Negative controls — proof that the guard tests in `weatherReference.test.ts`
 * can actually fail.
 * ---------------------------------------------------------------------------
 * These are NOT ordinary tests. Each one:
 *   1. copies a real production file to a scratch directory,
 *   2. applies the exact defect it is guarding against as a string edit,
 *   3. imports the MUTATED copy,
 *   4. asserts the mutated copy produces the wrong answer,
 *   5. asserts the live, unmutated module still produces the right one.
 *
 * Step 4 is the whole point. A guard test that passes for every input is not a
 * guard. The previous version of this check computed a "defective" value in
 * the test file and asserted on that local — so it could not detect a defect
 * in the module it claimed to be defending, and would have stayed green while
 * the fabrication bug sat in production.
 *
 * Nothing here writes to the working tree: mutations happen on copies in a
 * temp dir, so a failure here cannot leave the repo mutated.
 *
 * Skipped entirely when SKIP_NEGATIVE_CONTROLS=1.
 */

const RUN_NEGATIVE = process.env.SKIP_NEGATIVE_CONTROLS !== '1';

// The mutated copies must live INSIDE the project so Vite applies its
// TypeScript transform — a `.ts` file in the OS temp dir is served raw and
// fails to parse. node_modules/.cache is gitignored and eslint-ignored, so a
// leftover file from a crashed run cannot reach a diff or the gate.
const scratch = join(process.cwd(), 'node_modules', '.cache', 'metshield-negctl');
mkdirSync(scratch, { recursive: true });

// Tracked by exact name and removed one file at a time. A recursive delete of
// the directory would be broader than this suite's own footprint.
const written: string[] = [];
afterAll(() => {
  for (const f of written) {
    try {
      unlinkSync(f);
    } catch {
      /* already gone */
    }
  }
});

/**
 * Copies a production file into the scratch dir with `defect` substituted for
 * `anchor`, and imports the mutated copy.
 *
 * Relative imports (`./lib/...`, `@/lib/...`) are rewritten to absolute file
 * URLs, because the copy now lives in a temp dir where those specifiers would
 * resolve to nothing.
 *
 * Throws if `anchor` is gone rather than silently passing: if production code
 * moves, this control has to be re-pointed at the new location, not deleted.
 */
async function loadMutated(
  label: string,
  realPath: string,
  anchor: string,
  defect: string
): Promise<unknown> {
  const source = readFileSync(realPath, 'utf8');
  if (!source.includes(anchor)) {
    throw new Error(
      `negative control "${label}" no longer matches its anchor in ${realPath}. ` +
        `The production code moved; this control must be re-pointed, not deleted.`
    );
  }
  const mutatedPath = join(scratch, `${label}.ts`);
  // Relative specifiers are resolved against the ORIGINAL file's directory, so
  // use that — not cwd — when repointing them. '@/' specifiers are left alone:
  // they go through the Vite alias and still resolve from inside the project.
  const originDir = pathToFileURL(dirname(realPath)).href;
  const mutatedSource = source
    .replace(anchor, defect)
    .replace(/from '\.\/([^']+)'/g, (_m, spec: string) => `from '${originDir}/${spec}.ts'`);
  writeFileSync(mutatedPath, mutatedSource);
  // Each control writes a uniquely named file, so no two imports collide.
  written.push(mutatedPath);
  return import(pathToFileURL(mutatedPath).href);
}

describe.skipIf(!RUN_NEGATIVE)('negative controls — defects injected into production source', () => {
  it('catches a dropped pressure-datum gate in crossCheck', async () => {
    const mutated = (await loadMutated(
      'datum-gate',
      'lib/weatherReference.ts',
      '  const pressureOk = pressureComparable(reference);',
      '  const pressureOk = true; // INJECTED: datum gate removed'
    )) as typeof import('../lib/weatherReference');
    const { crossCheck: realCrossCheck } = await import('../lib/weatherReference');

    const station = { temperature: 20, relativeHumidity: 50, pressure: 1004, windSpeed: 5 };
    const qfe = {
      observedAt: '2026-09-30T10:00',
      temperature: 20, relativeHumidity: 50, pressure: 790,
      pressureDatum: 'STATION_SURFACE' as const, windSpeed: 5, precipitation: 0,
    };

    const realRow = realCrossCheck(station, qfe).comparisons.find((c) => c.channel === 'Pressure')!;
    const mutatedRow = mutated.crossCheck(station, qfe).comparisons.find((c) => c.channel === 'Pressure')!;

    // The real module refuses to difference two different datums...
    expect(realRow.delta).toBeNull();
    expect(realRow.comparable).toBe(false);
    // ...and the mutated module prints a -214 hPa altitude artefact, which is
    // exactly the number the guard test exists to prevent.
    expect(mutatedRow.delta).toBe(-214);
  });

  it('catches a fabricated reading when the provider returns no current block', async () => {
    const mutated = (await loadMutated(
      'fabricate',
      'app/api/weather/reference/route.ts',
      '  if (!current || current.temperature_2m === undefined) return null;',
      '  if (!current) return { observedAt: null, temperature: 21, relativeHumidity: 55, pressure: 1005, pressureDatum: "MEAN_SEA_LEVEL", windSpeed: 4, precipitation: 0 } as never;\n' +
        '  if (!current || current.temperature_2m === undefined) return null;'
    )) as typeof import('../app/api/weather/reference/route');
    const { normalizeReference: realNormalize } = await import('../app/api/weather/reference/route');

    // Real: no block, no reading. The UI renders REFERENCE UNAVAILABLE.
    expect(realNormalize({} as never, 216)).toBeNull();
    // Mutated: an invented 21 °C / 55 % reading that would render as real data.
    expect(mutated.normalizeReference({} as never, 216)?.temperature).toBe(21);
  });

  it('catches a missing pressure becoming 0 in normalizeReference', async () => {
    const mutated = (await loadMutated(
      'silent-zero',
      'app/api/weather/reference/route.ts',
      '    pressure: hasSurface ? reduced : null,',
      '    pressure: hasSurface ? reduced : 0, // INJECTED: silent zero'
    )) as typeof import('../app/api/weather/reference/route');
    const { normalizeReference: realNormalize } = await import('../app/api/weather/reference/route');

    const payload = { current: { time: '2026-09-30T10:00', temperature_2m: 20 } } as never;
    // Real: absent pressure is null, and its datum is UNKNOWN — not QFE.
    const realOut = realNormalize(payload, 216);
    expect(realOut!.pressure).toBeNull();
    expect(realOut!.pressureDatum).toBe('UNKNOWN');
    // Mutated: 0 hPa, indistinguishable from a real reading of 0 hPa.
    expect(mutated.normalizeReference(payload, 216)!.pressure).toBe(0);
  });

  it('catches a delta computed against a failed reference', async () => {
    const { crossCheck: realCrossCheck } = await import('../lib/weatherReference');
    const station = { temperature: 20, relativeHumidity: 50, pressure: 1004, windSpeed: 5 };

    // The defect this guards is substituting the station's own values for a
    // missing reference. It is the fabrication this product exists to prevent,
    // and it is subtle precisely because it looks correct: every delta comes
    // out a tidy 0.0 and the panel reads CLOSE AGREEMENT while the provider is
    // down and the operator is being told the two sources agree.
    const selfReference = {
      observedAt: null, temperature: station.temperature,
      relativeHumidity: station.relativeHumidity, pressure: station.pressure,
      pressureDatum: 'MEAN_SEA_LEVEL' as const, windSpeed: station.windSpeed, precipitation: null,
    };
    const out = realCrossCheck(station, selfReference);
    expect(out.comparisons.find((c) => c.channel === 'Temperature')!.delta).toBe(0);
    expect(out.status).toBe('CLOSE_AGREEMENT');

    // The real no-reference path yields nothing at all.
    const empty = realCrossCheck(station, null);
    expect(empty.comparisons).toHaveLength(0);
    expect(empty.comparableCount).toBe(0);
    expect(empty.status).toBe('REFERENCE_UNAVAILABLE');
  });
});


/**
 * NOT covered, recorded rather than hidden.
 *
 * The elevation guard in `reduceToMeanSeaLevel()` (`elevationM <= 0` returns
 * the input unreduced) is load-bearing for the QFE labelling: with no
 * registered elevation, `classifyPressureDatum` reports STATION_SURFACE and
 * `crossCheck` declines to difference it. But removing the guard does not
 * change any value this suite asserts, because the correction factor
 * `1 - (L*e)/(T + L*e + 273.15)` equals exactly 1.0 at e = 0. It only diverges
 * for e < 0, which cannot occur — IMD station elevations are positive.
 *
 * So a mutation that deletes the guard goes green. That is a genuine gap in
 * coverage, not a false alarm, and the honest fix is a direct assertion on the
 * QFE classification path rather than a mutation of the arithmetic. The test
 * "reports QFE and declines to reduce when elevation is unknown" pins the
 * observable behaviour; the arithmetic itself is pinned by
 * `__tests__/pressureReduction.test.ts`. What is untested is the redundancy
 * between them.
 */
