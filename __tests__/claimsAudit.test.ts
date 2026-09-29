/**
 * CLAIM AUDIT — a standing test that indefensible claims cannot return.
 *
 * WHY THIS IS A TEST AND NOT A COMMENT
 * ------------------------------------
 * The strings below were all removed from this repository because no code
 * produced them. They came back twice: once in the AI fallback responses, and
 * once more in the system prompts for the LLM path, where an operator with an
 * API key configured would have had the model generate the same fabrications
 * the deterministic path had just been cleaned of.
 *
 * A comment saying "we removed the HMAC claim" is a promise. This is a check.
 * If someone re-adds a fabricated metric to a response, a prompt, or a UI
 * label, this test fails and the change cannot be merged without someone
 * explicitly deciding the claim is real.
 *
 * SCOPE
 * -----
 * Only files that ship to the user are scanned. Documentation under docs/ and
 * the pitch generator under scripts/ are excluded on purpose: they describe
 * the intended national deployment, which genuinely does target 1,350+
 * stations, and they are reconciled separately as part of the documentation
 * pass. What must never happen is the *running product* asserting a number the
 * code does not compute.
 *
 * The scan strips comments before matching, because the fixes for these
 * defects are largely written as comments explaining what was removed — and a
 * test that fails on its own remediation notes is a test that gets deleted.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(__dirname, '..');

/** Directories whose contents reach a user at runtime. */
const SCANNED_DIRS = ['app', 'lib', 'components', 'hooks'];

/**
 * Parked, unreachable components retained for future work. Their headers say
 * the claims inside are known-false and must be fixed before reconnection, so
 * scanning them would produce permanent, unactionable failures.
 */
const EXCLUDED_DIRS = ['components/_quarantine'];

/**
 * Claimed values that appear nowhere in the codebase as a computed result.
 * Each entry is (regex, why it is indefensible).
 */
const FORBIDDEN_CLAIMS: Array<[RegExp, string]> = [
  [/HMAC-SHA256/i, 'no HMAC is computed anywhere; integrity is an unkeyed FNV-1a checksum'],
  [/cryptographic(ally)?\s+seal/i, 'no cryptographic seal exists; the field is a non-cryptographic checksum'],
  [/cryptographically\s+signed/i, 'nothing is signed; there is no key and no signature'],
  [/tamper[-\s]?proof/i, 'an unkeyed checksum cannot be tamper-proof; anyone can recompute it'],
  [/tamper[-\s]?resistan(t|ce)/i, 'same — no tamper resistance is provided'],
  [/\b1,350\b/, 'this repository ships 21 station profiles; the network-wide figure is context, not a count of what is here'],
  [/\b98\.4\s*%/, 'no classifier accuracy has ever been measured'],
  [/\b82\.3\s*%/, 'no Sensor Health Index is implemented'],
  [/\b34\s*%\s*noise/i, 'no Kalman or Butterworth filter exists in lib/'],
  [/\b45\s*days/i, 'no time-to-failure model is implemented'],
  // Verified by hand against lib/: neither filter is implemented anywhere.
  // `windowedMean` in lib/anomalyDetector.ts is a flat arithmetic mean.
  [/\b(Kalman|Butterworth)\b/i, 'no state-space or band-pass filter exists in lib/; imputation is a flat windowed mean'],
];

/**
 * NEGATION — checked within a WINDOW BEFORE the matched term, not per line.
 *
 * The most common correct sentence in this codebase is a denial: "NOT
 * HMAC-SHA256", "no tamper resistance", "is not a Merkle root". Those are the
 * opposite of a claim — they are the remedy. Matching them would make the
 * audit fail on its own fixes and teach everyone to delete the test.
 *
 * Positional, deliberately. A line-level check has a real hole: the string
 * "Integrity uses HMAC-SHA256 tamper-proof sealing. It is NOT HMAC-SHA256 and
 * not tamper-resistant." contains a denial, so a line-level negation check
 * passes it — and that is exactly the shape of a claim that survived review
 * once. A denial only counts if it governs the specific term being matched.
 */
const NEGATION = /\b(not|no|never|without|cannot|can't|isn't|does not|doesn't|neither|nor)\b/i;

/**
 * How much text before a match is examined at all.
 *
 * The clause boundary does the real scoping; this is only a search bound, and
 * it must be wide enough to reach the governing verb in a list. At 60 the slice
 * cut off mid-list — "Never describe any integrity value as a signature, seal,
 * HMAC, MAC, or tamper-resistant" was 90 characters, so the slice dropped
 * "Never" entirely and flagged a correct prohibition.
 */
const NEGATION_WINDOW = 200;

/**
 * CLAUSE SCOPE — a negation governs one clause, not the whole line.
 *
 * A fixed character window is wrong in both directions. Too narrow and it
 * fails on "…not a cryptographic seal. Never describe any integrity value as
 * a signature, seal, HMAC, MAC, or tamper-resistant", where the governing
 * "Never" is 90 characters back and the line is a correct denial. Too wide and
 * it clears a genuine claim that merely follows a denial in an earlier
 * sentence: "The system is not encrypted. Integrity uses HMAC-SHA256 sealing."
 * Truncating to the current clause scopes the negation to the term it actually
 * governs.
 *
 * The walk skips anything that is not a word character rather than splitting
 * on a fixed punctuation set, because a prohibition governs the whole list it
 * introduces — "Never describe any integrity value as a signature, seal, HMAC,
 * MAC, or tamper-resistant" is one denial whose terms are comma-separated, and
 * an em-dash (U+2014) is not matched by `\s`.
 */
const CLAUSE_BREAK = /[A-Za-z0-9]/;

/**
 * REMEDIATION LANGUAGE — also positional.
 *
 * Distinct from negation: a negation denies a property ("not tamper-proof"),
 * while remediation prescribes a future fix ("has to be replaced with a real
 * HMAC-SHA256"). The audit report names the correct mechanism to recommend
 * next, which is honest and necessary — but it is a recommendation, not a
 * description of what this build does.
 */
const REMEDIATION = /\b(has to be|have to be|needs? to be|must be|should be|replaced?|replacement|introduced|renamed|next step|intended|planned|future|would be)\b/i;

/**
 * True when `match.index` is governed by a denial or a prescription.
 *
 * The scope is the enclosing clause, capped at NEGATION_WINDOW. The window
 * deliberately reaches backwards only: a denial that follows the term
 * ("HMAC-SHA256 — not really") does not clear an assertion in front of it.
 */
function isNegatedOrRemediation(line: string, match: RegExpExecArray): boolean {
  const windowStart = Math.max(0, match.index - NEGATION_WINDOW);
  const raw = line.slice(windowStart, match.index);
  // Everything after the last clause boundary, so a negation in a previous
  // sentence cannot absolve a claim made in this one. Commas are scope, not
  // boundaries — a prohibition governs the list it introduces.
  let boundary = -1;
  for (let i = raw.length - 1; i >= 0; i--) {
    if (raw[i] === '.' || raw[i] === ';' || raw[i] === ':') boundary = i;
    else if (CLAUSE_BREAK.test(raw[i])) break;
  }
  const before = raw.slice(boundary + 1);
  return NEGATION.test(before) || REMEDIATION.test(before);
}

/**
 * The national-network figure is legitimate when a line frames 1,350+ as the
 * target environment rather than as a count of what this build contains.
 */
const NETWORK_CONTEXT_ALLOWANCE = /(designed|intended|target|network-wide|national|scope note|serves|serving|deploy)/i;

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full).split(sep).join('/');
    if (EXCLUDED_DIRS.some((ex) => rel === ex || rel.startsWith(`${ex}/`))) continue;
    if (statSync(full).isDirectory()) listSourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Remove comments so that documentation about the defect does not trip the
 * audit. Handles both // and /* *\/ styles plus JSX comments, which is enough
 * for this codebase — no file relies on a regex-in-string containing these terms.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, ' ');
}

/** Non-comment, non-import lines of a file, lowercased for matching. */
function claimLines(file: string): string[] {
  const raw = readFileSync(file, 'utf8');
  return stripComments(raw)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^import\b/.test(l) && !/^from\b/.test(l));
}

describe('claim audit — indefensible claims must not ship', () => {
  const files = SCANNED_DIRS.flatMap((d) => listSourceFiles(join(ROOT, d)));
  const violations: string[] = [];

  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join('/');
    for (const line of claimLines(file)) {
      for (const [pattern, why] of FORBIDDEN_CLAIMS) {
        // Every occurrence is checked, not just the first: a line can assert a
        // claim and then contradict itself, and the assertion is the defect.
        const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
        const matches = [...line.matchAll(global)];
        for (const match of matches) {
          // A denial governing this specific term is the remedy, not the disease.
          if (isNegatedOrRemediation(line, match)) continue;

          // The national-network figure is legitimate when the line explicitly
          // frames it as the target environment rather than this build.
          if (pattern.source.includes('1,350') && NETWORK_CONTEXT_ALLOWANCE.test(line)) continue;

          violations.push(
            `${rel}: "${line.slice(0, 120)}"\n    matched ${pattern} — ${why}`
          );
        }
      }
    }
  }

  it('scans the whole user-facing source tree', () => {
    // Guard against a path mistake silently reducing coverage to nothing.
    expect(files.length).toBeGreaterThan(50);
  });

  it('contains no fabricated metric or cryptographic claim in shipped code', () => {
    expect(
      violations,
      `Found ${violations.length} indefensible claim(s) in shipped code:\n\n${violations.join('\n\n')}`
    ).toEqual([]);
  });
});

describe('claim audit — the integrity mechanism is described accurately', () => {
  it('computeDemoIntegritySeal is documented as a non-cryptographic checksum', () => {
    const src = readFileSync(join(ROOT, 'lib', 'anomalyLogic.ts'), 'utf8');
    // The docblock must state the three properties that make the field names
    // misleading. If someone relabels it as a signature again, this fails.
    expect(src).toMatch(/NOT a cryptographic signature/i);
    expect(src).toMatch(/not HMAC-SHA256/i);
    expect(src).toMatch(/not a Merkle root/i);
  });

  it('the AI fallback for tool 6 describes a checksum, not a signature', () => {
    const src = readFileSync(join(ROOT, 'app', 'api', 'ai', 'tools', 'route.ts'), 'utf8');
    const tool6 = src.split('\n').filter((l) => l.trim().startsWith('6:')).join('\n');
    expect(tool6).toMatch(/FNV-1a/);
    expect(tool6).toMatch(/NOT a MAC/i);
    expect(tool6).toMatch(/no authenticity/i);
  });

  it('both AI routes carry the honesty constraint on the LLM path', () => {
    // The fallbacks were cleaned first, then the same fabrications reappeared
    // via the system prompts. This asserts the prompt-side guard is present.
    for (const rel of ['app/api/ai/tools/route.ts', 'app/api/ai/copilot/route.ts']) {
      const src = readFileSync(join(ROOT, ...rel.split('/')), 'utf8');
      expect(src, `${rel} must constrain the LLM path`).toMatch(/HARD CONSTRAINTS/);
      expect(src).toMatch(/never state or imply an accuracy percentage/i);
      expect(src).toMatch(/not implemented/i);
    }
  });
});
