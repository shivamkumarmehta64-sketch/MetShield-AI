import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Layout-regression guards for two defects that shipped to production and were
 * invisible to lint, typecheck and the 198-test suite:
 *
 *   1. `/mobile` threw React #418 on every load for any visitor outside IST.
 *      `useMobileSensors` read `new Date().getHours()` inside a `useState`
 *      initializer, so the server (Vercel edge, IST) and the browser (whatever
 *      zone the phone is in) computed different solar values for the same slot.
 *      Proven: browser TZ Asia/Kolkata -> #418; browser TZ UTC -> clean.
 *
 *   2. `/stations` and `/incidents` gained a document-wide horizontal scrollbar
 *      at 390px (802 vs 390, a 412px pan; 607 vs 390, a 217px pan). Tailwind's
 *      `.sr-only` is `position:absolute` with no offset, so inside a table row
 *      far down the page it resolved against the initial containing block and
 *      landed ~800px right of the viewport. `globals.css` now pins it to
 *      `left:0; top:0`.
 *
 * These are SOURCE assertions, not rendered-DOM assertions. A rendered test
 * needs a browser and a running server; vitest here runs in node. Asserting the
 * source is weaker than asserting the pixels, and the honest way to close that
 * gap is the Playwright probe in the task that added this. What these guards do
 * buy is that the specific defect cannot silently return through an edit to the
 * initializer or the CSS rule.
 */

const ROOT = join(__dirname, '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');
const sensors = read('hooks', 'useMobileSensors.ts');
const globals = read('app', 'globals.css');
const mobilePage = read('app', 'mobile', 'page.tsx');

/**
 * Source with comments removed.
 *
 * The fix for this defect is *documented* — the rationale names `getHours()` and
 * `new Date()` precisely so the next reader knows what not to reintroduce. A
 * guard that scans raw source therefore fails on its own remediation notes. This
 * is the same technique `claimsAudit.test.ts` uses, and for the same reason: a
 * guard that cries wolf over a comment gets deleted instead of fixed.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const sensorsCode = stripComments(sensors);
const globalsCode = stripComments(globals);

describe('mobile solar estimate cannot reintroduce a hydration mismatch', () => {
  /**
   * Matches the real defect shape: `useState<...>(() => { ... new Date(...) })`.
   *
   * Deliberately anchored on `new Date(` so it cannot be satisfied by prose. The
   * first version of the fix documented the discarded `useSyncExternalStore`
   * attempt in a comment containing that phrase, and a comment is not a
   * hydration bug — but a naive `/new Date/` scan fails the build on its own
   * remediation notes, which is how guard tests get deleted rather than fixed.
   */
  const CLOCK_IN_INITIALIZER =
    /useState<[^>]*>\(\(\)\s*=>\s*(?:\/\/[^\n]*\n\s*)*\{(?:(?!\}\)\s*[,;])[\s\S])*?new Date\(/;

  it('does not call new Date() inside a useState initializer', () => {
    // The whole defect: a wall-clock read evaluated during render, on both sides.
    expect(sensorsCode).not.toMatch(CLOCK_IN_INITIALIZER);
  });

  it('does not read the local hour inside a useState initializer', () => {
    // `getHours()` is the specific call that produced the mismatch, because it
    // returns the browser's zone rather than a fixed one.
    expect(sensorsCode).not.toMatch(CLOCK_IN_INITIALIZER);
    expect(sensorsCode).not.toMatch(/getHours\(\)/);
  });

  it('does not call Date.now() inside a useState initializer', () => {
    expect(sensorsCode).not.toMatch(/useState<[^>]*>\(\(\)\s*=>[\s\S]{0,200}?Date\.now\(\)/);
  });

  it('pins the solar estimate to one timezone instead of the local zone', () => {
    // A fixed zone is what makes the read a pure function of the instant, so
    // both sides compute the same hour and hydration matches.
    expect(sensorsCode).toMatch(/Asia\/Kolkata/);
  });

  it('resolves the hour through the pinned zone, not getHours()', () => {
    // Guards the specific regression: someone "simplifying" this back to
    // `new Date().getHours()` would restore the #418 for every non-IST visitor.
    expect(sensorsCode).toMatch(/timeZone:\s*'Asia\/Kolkata'/);
    expect(sensorsCode).not.toMatch(/getHours\(\)/);
  });

  it('documents that the store-based alternative was tried and rejected', () => {
    // The obvious next fix is useSyncExternalStore, which does not work here
    // because the route is statically prerendered. That is worth a comment.
    expect(sensors.replace(/\s+/g, ' ')).toMatch(/useSyncExternalStore[\s\S]{0,200}?discarded/i);
  });

  it('still says the value is an estimate, not a measurement', () => {
    // The curve is a half-sine. Without this label it reads as a pyranometer.
    // Matched against whitespace-collapsed source so a rewrap cannot silently
    // pass — or silently fail — a guard that exists to be read, not run.
    expect(sensors.replace(/\s+/g, ' ')).toMatch(/NOT: a measurement/i);
  });

  it('keeps the UI label that discloses the estimate', () => {
    expect(mobilePage).toMatch(/est\. from clock/i);
  });
});

describe('screen-reader-only text cannot reintroduce document overflow', () => {
  it('contains .sr-only to the viewport edge', () => {
    // Without left:0 the box anchors to its static position, ~800px right.
    const rule = globalsCode.match(/\.sr-only\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/left:\s*0/);
    expect(rule![1]).toMatch(/top:\s*0/);
  });

  it('explains why the containment is required', () => {
    // A comment that documents the failure mode is what stops the next person
    // deleting the rule as redundant.
    expect(globals.replace(/\s+/g, ' ')).toMatch(/initial containing block/i);
  });

  it('keeps the utility itself — containment only, no replacement', () => {
    // The rule must not restate clip-path/width/height, or it would drift from
    // Tailwind's own definition and start fighting it on specificity.
    const rule = globalsCode.match(/\.sr-only\s*\{([^}]*)\}/);
    expect(rule![1]).not.toMatch(/clip-path/);
    expect(rule![1]).not.toMatch(/white-space/);
    expect(rule![1]).not.toMatch(/overflow/);
  });

  it('still uses sr-only rather than aria-label for badge meanings', () => {
    // The accessible name has to survive: this is containment, not removal.
    const badge = readFileSync(join(ROOT, 'app', 'dashboard', 'WmoFlagBadge.tsx'), 'utf8');
    expect(badge).toMatch(/sr-only/);
  });
});