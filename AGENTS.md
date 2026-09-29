<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Everything below is the project's own ruleset. The block above is machine-managed;
     edit around it, not inside it. Next's writer only rewrites the marker region. -->

# MetShield AI — Agent Rules

**MetShield AI | NAWS-MetShield | SIH 2026 | MoES / IMD, Government of India**

An AI-powered Quality Management System for the national Automatic Weather Station
network. It discriminates *genuine atmospheric events* (squalls, downbursts) from
*hardware transducer faults*, and quarantines bad observations before they reach NWP
assimilation.

---

## 1. First rule

Before changing code:

1. Locate the relevant files. Do not answer from filenames.
2. Read the implementation and trace its dependencies and callers.
3. Reuse existing components, engines, and API routes.
4. **Never invent backend functionality that does not exist.**
5. **Never fabricate meteorological data.**

`grep` for the symbol and read it. If you cannot find the code, it does not exist —
do not reason about what it "probably" does.

---

## 2. Data integrity — non-negotiable

This is a compliance product. A number that looks official but was synthesised is
**worse** than an obvious placeholder, because a reviewer cannot tell which is which.

- **Never represent simulated data as real.** Live, derived, and simulated values are
  distinct claims. Render `SIMULATED` through `<ProvenanceBadge />`.
- **Use N/A** when data is unavailable. Do not substitute zero, mean, or a guess.
- **Preserve units and timestamps.** IST, hPa, °C, °F — as the source stated them.
- **Do not claim a capability that is not implemented.** See §13 of `README.md`
  ("Honest Engineering Notes & Known Limitations") for the claims this repo has
  already retracted. Read it before writing UI copy.
- **A guard test that reports zero violations is not evidence it works.** After
  writing any "this can never happen again" test, inject the exact defect it guards
  against, confirm it FAILS, then restore — before reporting the test as done.
  (`__tests__/claimsAudit.test.ts` shipped a false HMAC claim past a line-level
  negation check for exactly this reason.)

### Where provenance lives

`lib/dataProvenance.ts` is the single source of truth. Every entry in `DATA_SOURCES`
carries a `Provenance` of `LIVE | DERIVED | SIMULATED`. When a real feed replaces a
simulated source, flip that one entry — the badge UI retires itself.

`lib/networkFeed.ts` adds a coarser switch: `DATA_MODE` (`LIVE | BENCHMARK | REPLAY |
SIMULATED`) with `DATA_MODE_STATEMENT` rendered by `<DataModeBadge />`. Currently
`BENCHMARK`. **If you change `DATA_MODE`, say so out loud in your summary** — it
changes what every number on the dashboard means.

---

## 3. Tech stack — do not replace

Detected from `package.json`. Do not substitute frameworks or add dependencies without
being asked.

| Layer | Choice |
|---|---|
| Framework | Next.js `16.3.4`, App Router |
| Language | TypeScript 5, `strict: true` |
| Styling | Tailwind CSS 4 (`@theme` block in `app/globals.css`) |
| Charts | Recharts 3 |
| Maps | Leaflet 5 + `react-leaflet` 5 |
| Animation | Framer Motion 13, `lucide-react` icons |
| Tests | Vitest 5 |
| Lint | ESLint 9 + `eslint-config-next` |
| AI | AI SDK 7, `@ai-sdk/openai` (`gpt-4o-mini`, optional) |
| Edge target | Cloudflare Workers via `vinext` / `wrangler` |
| Deploy | Vercel (`vercel.json`) |

**Next 16 specifics already in this repo:** use `proxy.ts`, not `middleware.ts`
(`middleware.ts` has been deleted). Prefer the default Node.js runtime over
`export const runtime = 'edge'` — the Edge runtime is deprecated. `next build` does
**not** run ESLint, which is why `build` shells out to `verify` first.

---

## 4. Architecture — the QC pipeline

```
AWS → Ingestion → Validation → Range QC → Temporal QC → Multivariate QC
    → Spatial QC → Anomaly discrimination → XAI explanation → QC Flag / Correction
```

The engine is real and it is the centre of the product. Bind UI to it; do not
reimplement it.

| Concern | Module |
|---|---|
| QC engine, flags, XAI, imputation, work orders | `lib/anomalyLogic.ts` — `NICWMOAnomalyEngine.evaluate()` |
| Station registry (21 real IMD stations) | `lib/stationData.ts` |
| Network snapshot, KPIs, QC checks, scenarios, incidents | `lib/networkFeed.ts` |
| Telemetry write auth (per-station PSK, fails closed) | `lib/auth.ts` |
| Rate limiting | `lib/rateLimit.ts`, `lib/aiLimits.ts` |
| Anomaly detectors (heatwave, sensor fault, district) | `lib/heatwaveEngine.ts`, `lib/sensorFaultEngine.ts`, `lib/districtEngine.ts` |
| Edge ML decision tree (rule-based, not trained) | `lib/mlAnomalyModel.ts` |
| Provenance registry | `lib/dataProvenance.ts` |
| D1 work-order store | `lib/d1Adapter.ts` |

**WMO quality flags** (`WMOQualityFlag`, `lib/anomalyLogic.ts:5`):

```
FLAG_1_VERIFIED_GOOD  FLAG_2_CONVECTIVE_STORM  FLAG_3_SUSPECT_DRIFT
FLAG_4_CORRUPT_HARDWARE  FLAG_5_PACKET_LOSS
```

**Root causes** (`RootCauseClassification`): `NOMINAL_OPERATION`,
`GENUINE_CONVECTIVE_EVENT`, `SENSOR_SPIKE`, `FROZEN_VALUE`, `CALIBRATION_DRIFT`,
`TELEMETRY_PACKET_LOSS`.

**Storm discrimination invariant** (the load-bearing rule): a pressure drop
ΔP ≤ −2.5 hPa is only a storm if it is *coupled* to ΔRH ≥ +15 and ΔT ≤ −1.5.
A pressure drop alone is drift. Changing this threshold changes what the product
is — treat it as a domain decision, not a tuning knob.

**Routes:** `/` `/dashboard` `/incidents` `/analytics` `/audit-report` `/stations`
`/mobile` `/demo`.

**API:** `/api/telemetry` (write, PSK-auth), `/api/weather` (live Open-Meteo),
`/api/ai/copilot`, `/api/ai/tools`, `/api/assistant`, `/api/network-ip`,
`/api/og/certificate`, `/api/telemetry/cron`.

---

## 5. Design language

Meteorological operations centre. Scientific monitoring. Government / deep-tech.
Dense but readable.

**The theme is LIGHT, not dark.** `app/globals.css` ships a light operations console
(`--color-page: #F8FAFC`). There is no `data-theme="dark"` block any more. Do not
reintroduce one, and do not reintroduce the retired brand red `#C0162C`.

### Tokens (from `@theme` in `app/globals.css`)

| Meaning | Token | Value |
|---|---|---|
| Brand / institution | `--color-navy` | `#0B1F3A` |
| | `--color-navy-deep` | `#123B63` |
| | `--color-sky` | `#1683D8` |
| | `--color-teal` | `#0E9F9A` |
| Page surface | `--color-page` | `#F8FAFC` |
| Card surface | `--color-card` | `#FFFFFF` |
| Hairline | `--color-hairline` | `#E2E8F0` |
| Ink / muted / faint | `--color-ink` | `#0B1F33` |
| | `--color-ink-muted` | `#475569` |
| | `--color-ink-faint` | `#94A3B8` |

### Colour carries exactly one axis: operational status

| Meaning | Fill (`--color-*`) | Text (`--color-*-text`, AA-passing) |
|---|---|---|
| Healthy | `--color-healthy` `#16A34A` | `--color-healthy-text` `#15803D` |
| Warning / drift / watch | `--color-warning` `#F59E0B` | `--color-warning-text` `#B45309` |
| Weather event | `--color-weather` `#F97316` | — |
| Critical fault | `--color-fault` `#DC2626` | `--color-fault-text` `#B91C1C` |
| AI / model decision | `--color-ai` `#7C3AED` | `--color-ai-text` `#6D28D9` |
| Telemetry | `--color-telemetry` `#1683D8` | `--color-telemetry-text` `#0369A1` |

Each status has a matched pair: a saturated `--color-*` for **badge fills** on a
tinted `--color-*-bg`, and a darker `--color-*-text` for **12px text on white** (the
fill values are ~2:1 on white and fail WCAG AA). Use the right one for the right
surface. **There is one ramp with two weights. Do not add a third.**

`#DC2626` appears in `app/globals.css` only on `--color-fault`. Red is reserved for
critical faults and nothing else — not brand chrome, not focus rings, not selection.
Weather-semantic ramps (temperature blue→red, humidity cyan, pressure violet, wind
green, rain blue) belong in chart code only.

---

## 6. Commands

```bash
npm run dev         # dev server
npm run verify      # lint && typecheck && test — the gate
npm run build       # verify, then next build
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run bench       # reproducible detector benchmark (tsx)
```

`npm run build` runs `verify` first, so **one lint error blocks the whole build.**
`eslint.config.mjs` promotes three rules to `error` because each caught a defect that
reached `main` — keep them at `error`:

```
react-hooks/purity                     # Date.now() during render
react-hooks/set-state-in-effect        # cascading re-render on mount
@typescript-eslint/no-explicit-any      # hid a missing field behind a cast
```

### One-off scripts (`scripts/`, run individually)

| Script | Purpose |
|---|---|
| `verify-detector.ts` | Probe the anomaly engine's verdict path |
| `verify-heatwave-engine.ts` | Probe the heatwave engine |
| `verify-vayu-fault-engine.ts` | Probe the Vayu fault engine |
| `benchmark-detector.ts` | Reproducible benchmark (`npm run bench`) |
| `skyguard_anomaly_engine.py` | Reference engine, `npm run sih:demo` |
| `record_walkthrough.mjs` / `record_mobile_vertical.mjs` | Playwright capture |
| `check-purnea.ts`, `generate_sih_ppt.py`, `convert_to_mp4.mjs` | Pitch material |

---

## 7. Verification — prove it, don't read it

Two of this codebase's worst bugs were invisible in source and typecheck-clean.
**Both were found by running the code.**

- A seeded demo fault had already expired before anyone looked at the dashboard.
- A storm injection on a high-humidity station saturated at 100% and could never
  fire the detector.

So:

- **Run a runtime probe. Reading the source is not verification.**
- **Negative-control every guard test** — inject the defect, watch it fail, restore.
- After UI changes: run the app, look at the rendered output, check desktop *and*
  mobile, check the console, fix overflow and alignment.
- `next build` does not lint, and a passing test suite proves nothing about the UI.

### Known traps

- **Seeded scenarios have constraints.** `getInitialSeededDataset()` runs exactly 14
  ticks (0–13). A trigger with `maxTicks < 14 - tick` has expired before the console
  ever renders it. And a station already above ~80% RH has no headroom for the
  fixed +19.6 RH storm injection, so it can never carry a storm. When adding a
  scenario, check both — or use `runScenario()`, which seeds
  `BASELINE_TICKS = 8` first because `ratesOfChange` is zero on tick 0.
- **Orphaned files.** `components/_quarantine/` holds a component imported by nothing.
  23 more are dead: all 18 `Gov*` components (the tree roots at
  `GovInstitutionalConsole`, which nothing imports) and all 5 `Vayu*` components.
  Their API routes are dead too — `/api/assistant`, `/api/network-ip`, and
  `/api/og/certificate` are only called from inside that orphan tree. `GuidedTour`,
  `JatayuAssistant`, and `MetshieldAICopilotModal` are likewise unimported.
  Do not wire one up "because it exists" — check that it is real first.
- **`.gitignore` excludes `CLAUDE.md`, `AGENTS.md`, `.claude/`, and `.env*`.** These
  files are real and load at runtime but will never appear in a diff or a commit.
  Read them from disk; do not conclude they are missing because `git status` is
  quiet about them. To share them, un-ignore deliberately.
- **Env vars are load-bearing.** `METSHIELD_STATION_CREDENTIALS` unset ⇒
  `POST /api/telemetry` refuses every write with 503. That is the designed
  fail-closed behaviour, not a bug — do not add a demo bypass. See `.env.example`.

---

## 8. Coding rules

- Smallest correct change. No speculative features, no speculative abstractions.
- Do not refactor unrelated code. Do not rewrite what works.
- Reuse existing components, engines, and routes before adding new ones.
- Modular components. Strict TypeScript — no `any` (it is a lint error).
- Comments explain **why**, not what. Match the surrounding density and idiom; the
  existing modules carry dense rationale headers and earn them.

---

## 9. Long tasks

Maintain `progress.md` at the repo root: current phase, completed, in progress,
remaining, known issues, next action. Update it as you go, not at the end.

Break work into phases and checkpoint with git. Before an architectural change,
inspect `git status` and preserve what already works.

---

## 10. Definition of done

A task is **not** complete if:

- `npm run verify` fails, or `npm run build` fails
- TypeScript errors remain
- An obvious UI bug remains, or a button is non-functional
- A route is broken or an API error is ignored
- Placeholder content remains unintentionally
- **Simulated data is presented as real**
- **A capability is claimed that the code does not implement**
- A guard test was never observed to fail

Report what you actually verified. If a step was skipped, say so. If tests fail,
paste the output.
