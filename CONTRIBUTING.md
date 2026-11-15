# Contributing

Thanks for looking. This is a small, opinionated codebase with one rule that
matters more than the rest: **do not claim a capability the code does not have.**

## Run it

```bash
npm ci
cp .env.example .env.local   # optional; telemetry writes fail closed without it
npm run dev                  # http://localhost:3000
```

## The gate

```bash
npm run verify   # eslint (0 errors) → tsc --noEmit → vitest
npm run build    # verify, then next build
```

`build` runs `verify` first, so one lint error blocks the build. Do not merge
with a red gate.

## Benchmarks

```bash
npm run bench        # 20,000 seeded synthetic frames; no network
node scripts/fetch-real-aws-data.mjs   # pulls ~36 MB of recorded station data
npm run bench:real   # injects faults into recorded episodes
```

If you change the detector, paste **before and after** numbers from both in the
pull request. A change that improves a rule without moving a measured number is
a change nobody can review.

## Data integrity rules

- Never present simulated data as real. Every source carries a
  `LIVE | DERIVED | SIMULATED` label in `lib/dataProvenance.ts`; `DATA_MODE` in
  `lib/networkFeed.ts` says how the console is being driven.
- Use `N/A` when a value is unavailable. Do not substitute zero, a mean, or a guess.
- Do not add a metric to the UI, the README or the pitch deck that no code
  computes. `__tests__/claimsAudit.test.ts` scans `app/`, `lib/`, `components/`,
  `hooks/` and `scripts/` for exactly this, and it will fail your build.

## Before you add a claim

Read [README §13](README.md#13-honest-engineering-notes--known-limitations). It
lists what this repository deliberately does *not* do — no trained model, no
SHAP, no Kriging, no detectable calibration drift. Those are retractions, not
gaps to be filled with marketing copy.

## Commit style

Conventional commits, imperative subject, ≤72 characters, and a body that says
*why*. If a change is measurable, put the number in the body.

## Reporting a security issue

See [SECURITY.md](SECURITY.md). Please do not open a public issue for one.
