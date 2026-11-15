# ADR-0002 — The QC engine is a framework-free domain module

**Status:** Accepted · 2026-11-15

## Context

`lib/anomalyLogic.ts` decides whether an observation is weather or hardware. It
is the product. Today its boundary is porous:

- 39 files import `@/lib/anomalyLogic` or `@/lib/networkFeed` directly.
- `lib/stationData.ts` — the station registry — re-exports network fetch
  functions **and a React hook** (`useLiveStationWeather`). That re-export is
  used by nobody, and it creates the cycle
  `stationData → liveWeatherService → stationData`.
- 73 of 158 source files carry `'use client'`, so the domain is pulled into
  client bundles alongside the UI that renders it.
- The engine's exports include packet construction, buffer access, work-order
  ids and IST formatting — callers reach into all of it.

## Decision

The engine's public surface is one use case: **observation in, verdict out.**

```
evaluate(observation: Observation): Verdict
```

`Verdict` carries classification, WMO flag, alert level, attribution and the
recommended action. Everything else — buffers, packet shape, work-order ids,
time formatting, seeding — stays behind the seam.

`lib/stationData.ts` is a data module. It does not re-export I/O or hooks.

## Consequences

- A test asserts on verdicts, not on packet internals.
- The benchmark and the console consume the same surface, so a rule change is
  visible in both without either reaching into the other.
- Extraction into a standalone package becomes mechanical rather than a rewrite.
- Callers that need packet internals (the console's table, the audit export)
  must get them from the verdict or from a separate read model — that is a
  real migration cost, not a rename.

## Alternatives rejected

- **Leave the exports and document them.** The interface is as wide as the
  implementation, so any test or caller is coupled to *how* it decides; the
  deletion test fails — removing the seam moves complexity into every caller.
- **Move the engine to a package now.** Premature: the interface does not exist
  yet, so a package would publish today's internal shape as a contract.
