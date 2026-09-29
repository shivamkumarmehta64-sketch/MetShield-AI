# MetShield AI — Progress

> External memory for long-running work. Update as you go, not at the end.
> Project rules live in `AGENTS.md` (loaded via `CLAUDE.md`).

## Current Phase

**Phase 6 — Final Color & Visual Polish.** Completed 2026-09-29.
Applied meteorological color system (sky `#38BDF8`, deep sky `#0EA5E9`, pressure `#8B5CF6`, humidity `#22D3EE`, wind `#34D399`, temperature `#FB923C`, critical `#EF4444`, healthy `#22C55E`, warning `#F59E0B`).
Streamlined UI text across KPI cards, tables, maps, and operations panels following the NUMBER → LABEL → STATUS hierarchy.

**Baseline verified 2026-09-29** — `npm run verify` green:
lint 0 errors / 0 warnings · typecheck 0 errors · **14 test files, 132/132 tests** · `npm run build` succeeds (16 routes).

## Architecture map (Phase 2)

Ground truth, established by runtime probe and by reading every route:

- **Station registry: 21 stations** (`lib/stationData.ts`). An earlier text scan
  found 23; two of those — `AWS-JOD-08`, `AWS-CHE-10` — occur only inside a
  *comment* at `lib/stationData.ts:101,104` that documents a previously-fixed
  silent-fallback bug. They are not stations. Never scan a source file for IDs to
  count stations; count `IMD_AWS_STATIONS.length` at runtime.
- **Snapshot KPIs** (deterministic, 14 ticks, base epoch ends 2026-03-11T09:19:57Z):
  21 total · 18 nominal · 1 weather event (AWS-CHN-03) · 1 drift (AWS-PUN-08) ·
  1 fault (AWS-DEL-04) · 0 telemetry issues · quality 85.7 · 12 incidents ·
  3 seeded stations.
- **Every shell page composes `app/dashboard/Shell.tsx`.** That is the single
  place to change chrome, nav, and the provenance strip.
- **Genuinely excellent, leave alone:** `QcPanel`, `Testbench`, `WmoFlagBadge`,
  `StationRegistryTable`, `IncidentTable`, `InvestigationPanel`, `Topbar`,
  `Sidebar`, `KpiStrip`, `networkFeed.ts`, and the whole of `app/stations`,
  `app/incidents`, `app/analytics`. These bind to the engine and state their
  own limits ("not measured", "not a calibrated probability").
- **`app/mobile`** is a field-node client, not a fabricated dashboard: it reads
  real device sensors, posts to the PSK-protected `/api/telemetry`, and already
  reports a refused write as refused.

## Defect inventory (Phase 1) — ALL RESOLVED

| # | File | Defect | Status |
|---|---|---|---|
| D1 | `app/dashboard/TelemetryConsole.tsx` | Fabricated Math.random() walk, hardcoded packet count, phantom stations, >LIVE< badge in retired red | ✅ Fixed — reads from real engine buffer |
| D2 | `app/dashboard/StationTable.tsx` | Dead CSV button, "Showing 1–0 of 0", raw hex | ✅ Fixed — onClick handler, empty state, design tokens |
| D3 | `app/dashboard/ProvenanceStrip.tsx` | Hardcoded SIMULATED_REPLAY, never read from DATA_MODE | ✅ Fixed — reads DATA_MODE directly |
| D4 | `app/mobile/page.tsx:628` | Permanently-painted green UPLINK LIVE pill | ✅ Fixed — derived from server response |
| D5 | `app/demo/page.tsx` | Undesigned, no provenance, raw Tailwind | ✅ Fixed — Shell, KpiStrip, DataModeBadge, proper labels |
| D6 | `app/dashboard/StationTable.tsx` | Duplicates StationRegistryTable | ✅ Resolved — rebuilt as compact matrix; serves different purpose |
| D7 | `app/analytics/page.tsx:82` | Broken /benchmark route reference | ✅ Fixed — removed broken link |
| D8 | `lib/anomalyLogic.ts:469` | console.warn on every rule-vs-rules disagreement | ✅ Fixed — removed; data carried in mlPrediction.agreesWithRules |
| D9 | `README.md` §8 + badge | Advertised "17/17" tests | ✅ Fixed — updated to 132/132 |
| D10 | `.gitignore` | Excludes CLAUDE.md, AGENTS.md, .claude/ | ⚠️ Needs explicit user decision |

## Visual polish (Phase 4)

- KPI strip fault indicator: increased from 0.5px to 1px bar + subtle bg tint
- Map markers: added hover scale animation (150ms ease)
- Cards: added subtle hover shadow + border color transition
- Page background: subtle gradient from --page to #F1F5F9

## Completed

- [x] `AGENTS.md` — full project ruleset: data-integrity mandate, real design tokens,
      QC pipeline map, WMO flags, verification discipline, known traps
- [x] `.claude/settings.json` — scoped permissions, destructive commands denied
- [x] `.claude/commands/` — `/audit` `/verify` `/ui` `/backend` `/deploy`
- [x] `progress.md` — this file
- [x] Baseline verify captured
- [x] D1–D10 all fixed (D10 pending user decision)
- [x] Visual polish pass complete

## In Progress

- [ ] Final verify gate run

## Remaining

- Decide whether `CLAUDE.md` / `AGENTS.md` / `.claude/` should be un-ignored and committed —
  they are currently gitignored, so teammates get none of this — D10
- Confirm the "Edge Runtime is deprecated" build warning's source route; it has been
  outstanding since 2026-09-28
- Optional: `vitest.config.ts:10` uses `__dirname` under `configLoader: 'native'` —
  switch to `import.meta.dirname` to clear the Vite advisory

## Known Issues

- **`DATA_MODE = 'BENCHMARK'`** (`lib/networkFeed.ts:37`). The console is driven by
  deterministic replay, not live ingest. Any change to it changes what every number on
  the dashboard means — announce it.
- **Seeded scenario constraints.** `getInitialSeededDataset()` runs exactly 14 ticks
  (0–13): a trigger with `maxTicks < 14 - tick` has expired before the console renders.
  And a station above ~80% RH has no headroom for the fixed +19.6 storm injection.
  Both failure modes are silent — verify with a runtime probe, not a reading.
- **Orphaned surface (verified 2026-09-29).** `components/_quarantine/` plus 23 more
  files are imported by nothing: all 18 `Gov*` components (rooted at
  `GovInstitutionalConsole`) and all 5 `Vayu*` components. Consequently
  `/api/assistant`, `/api/network-ip`, `/api/og/certificate` are unrouted — their only
  callers live in that dead tree. `GuidedTour`, `JatayuAssistant`, and
  `MetshieldAICopilotModal` are also unimported. Do not wire one up without checking
  it is real first.
- **`README.md` §13** remains the authority on retracted claims (no trained ML, XAI is
  not SHAP, the integrity tag is a checksum not a MAC). Read it before writing UI copy.
- Pre-existing and harmless: Vite `__dirname` advisory in `vitest.config.ts`.

## Next Action

Run final verify gate. If green, the product is ready for SIH 2026 presentation.
