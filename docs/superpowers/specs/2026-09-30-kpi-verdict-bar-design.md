# KPI verdict bar + scenario picker — design spec

**Date:** 2026-09-30
**Status:** awaiting review
**Scope:** `app/dashboard/KpiStrip.tsx`, `app/dashboard/page.tsx`, `app/dashboard/Topbar.tsx`

## Intent

Give the operations console one answer per glance. Today the KPI strip shows four
figures at equal weight and the scenario controls show eight unlabelled buttons,
so an operator must read everything to work out whether anything is wrong. The
palette and accessibility posture are already sound; the defect is composition.

Success is: an operator can tell whether the network is healthy, and what needs
attention, without reading a single number.

## Constraints (non-negotiable)

- Light theme only. No `data-theme="dark"`, no new surface ramp. `--color-page`
  stays `#F8FAFC`.
- Sky blue stays the brand/transport accent. No new hues.
- Colour carries exactly one axis: operational status (AGENTS.md §5). No third
  ramp, no decorative tinting.
- No new data. Every figure comes from `computeKpis(getNetworkSnapshot())`, which
  is already the source the table behind it uses.
- Status is never carried by colour alone — dot + word, per WCAG 1.4.1.
- Red stays reserved for `--color-fault`.

## Research basis

- Grafana dashboard best practices — "keep your graphs simple and focused on
  answering the question"; "cognitive load is how hard you need to think to figure
  things out ... when you're trying to figure out what broke at 2 AM"; "blue means
  good, red means bad".
  https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/
- ISA-101.01 / IEC 62682 — separate monitoring from control; alarms as a workflow
  with explicit states rather than undifferentiated badges.
- WCAG 2.2 §1.4.1 Use of Color — https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html

## Design

### 1. Verdict row (KpiStrip.tsx)

A header band above the four tiles.

```
┌────────────────────────────────────────────────────────────────┐
│  NETWORK STATUS                                    [BENCHMARK] │  ← one chip, strip level
│  ─────────────────────────────────────────────────────────────  │
│  ⚠  2 STATIONS NEED ATTENTION                                 │
│     Convective Storm · Sensor Drift                           │
│  ─────────────────────────────────────────────────────────────  │
│   19 / 21   │   94.2%   │    3    │   4.8 ms  │                │
│   stations  │   quality │  active │   engine  │                │
│   ● ok      │ ● target  │ ● storm │  ● pass   │                │
└────────────────────────────────────────────────────────────────┘
```

- **Header**: `t-label` "Network status", and a single provenance chip showing
  `DATA_MODE`. The chip moves here from the four tiles; the four per-tile chips
  are deleted. One statement of provenance per strip, not four.
- **Verdict line**: computed from `computeKpis`. Four cases, chosen in order:
  - `activeFaults > 0` → tone `fault`, `"N STATION(S) REPORT HARDWARE FAULT"`,
    detail lists the faulting stations
  - `activeAnomalies === 0` → tone `healthy`, `"NETWORK NOMINAL"`, detail
    `"All N registered stations at WMO Flag 1"`
  - `activeAnomalies > 0` → tone `warning`, `"N STATIONS NEED ATTENTION"`,
    detail joins the non-zero counts: weather events, drift, packet loss
- **Detail line** states the composition in words — the existing per-KPI `status`
  strings already compute this, so reuse rather than re-derive.
- **Numbers de-tinted**: `TONE_TEXT[kpi.tone]` is removed from the 28px value;
  values render in `--color-ink`. Tone is carried by the dot + word beneath. A
  healthy 94.2% and a failing 91.0% currently shout at the same volume; after
  this change colour means status, not magnitude.
- **Value size** 28px → 26px so the verdict line leads rather than ties.

### 2. Scenario picker (page.tsx)

`ScenarioControls` renders `SCENARIOS` (8 entries, each already carrying a
`description` in `lib/networkFeed.ts:374-420`) as bare bordered buttons in a 2-col
grid with no active state.

- **Active scenario**: `--color-telemetry` border, `--color-telemetry-bg` fill,
  a `Check` glyph, `aria-pressed="true"`.
- **Inactive**: hairline border, `--color-card`, hover on `--surface-hover`.
- **Each entry shows its `description`**, truncated to one line. The strings are
  already written and were simply not surfaced.
- **Card header** names the running scenario, so the control state is readable
  without clicking anything.
- Layout stays one column list (not a grid) — 8 rows at ~44px each is a rail, and
  the right-hand column is 300px.

### 3. Provenance label bug (Topbar.tsx)

`Topbar.tsx:234` renders `{snapshot.dataMode} REPLAY`. With `DATA_MODE =
'BENCHMARK'` this displays **"BENCHMARK REPLAY"** — a compound label that is
meaningless and a provenance claim that is wrong.

- Render `snapshot.dataMode` alone.
- This is a data-integrity defect, not cosmetic; it ships regardless of the rest.

## Testing

- `npm run verify` — lint (the three promoted `error` rules), typecheck, 132 tests.
- `npm run build`.
- **Negative-control**: `computeKpis` already has tests. Before reporting done,
  confirm the verdict row renders each of the four cases by driving `SCENARIOS`
  through the existing `runScenario()` path and reading the rendered output — not
  by reading the source. Per AGENTS.md §7, reading is not verification.
- Check `/dashboard` at 1280×800 and 390×844; no horizontal scroll, no clipping.

## Out of scope

StationTable, the tab bar, LeafletMap, TelemetryConsole, QcPanel, Testbench,
/stations, /incidents, /analytics. Token values are unchanged.
