# Mobile Field Node Redesign & Telemetry Correctness Pass

**Date:** 2026-09-27
**Status:** Approved in conversation; awaiting spec review
**Scope:** `/mobile` redesign, telemetry-console correctness, spec §4 accessibility compliance

---

## 1. Problem Statement

`/mobile` is a 992-line single-file React client for field technicians. Three problems, in priority order:

1. **The telemetry console asserts data it does not have.** When a station has no packets, `GovObservationConsole` substitutes a fabricated packet that is indistinguishable from a real one — including a fake `securitySeal.hmacSha256` and `tamperStatus: 'AUTHENTIC'`. For a product whose entire value proposition is detecting unreliable sensor data, displaying invented compliant data with a forged signature is the most damaging possible failure mode.

2. **The interface does not meet its own written specification.** `docs/UIUXD_DESIGN_SPECIFICATION.md` §4 requires four accessibility features. None are implemented. The theme migration in commit `5c009fc` was left half-finished across 14 files.

3. **Two spec §3.2 features do not exist in code at all:** wiring schematics and bench calibration.

A logic analysis also found **14 concrete defects** in the mobile and dashboard paths (Appendix A). These must be fixed *before* the visual work, because extracting components would otherwise copy the defects verbatim into new files.

### Non-goals

- Unblocking pinch-zoom in `app/layout.tsx` (`maximumScale: 1, userScalable: false`). This is app-wide, not mobile-scoped, and belongs in separate work.
- Completing the light/dark migration across the 13 non-mobile files that still use the dark navy theme.

### Decomposition

This is four independently shippable increments, not one change. The implementation plan covers **Phase 0 only**; Phases 1–4 get their own plans once Phase 0 has landed and proved clean. Phases 0 and 1 are safe to merge on their own. Phases 2–4 should not start until the Phase 0 regression tests are in place.

---

## 2. Guiding Decision

**Correctness precedes presentation.** The phases are ordered so that each is independently verifiable and ships value alone.

- Phase 0 is a pure logic fix with **no visual change**. If anything looks different after it, that is a regression.
- Phase 1 is purely additive theming.
- Phases 1–3 are presentational; Phases 0 and 4 carry the only logic changes.

---

## 3. Phase 0 — Telemetry Correctness

### 3.1 Remove fabricated telemetry

`components/GovObservationConsole.tsx:199` substitutes a synthetic packet when `packets` is empty:

```ts
const active = useMemo(() => packets.length > 0 ? packets : [makeFallback(selectedStation)], [...]);
```

**Change:** when `packets` is empty, render an explicit *awaiting telemetry* state. The synthetic packet is removed entirely.

The fallback carries `FLAG_1_VERIFIED_GOOD`, `LEVEL_0_NOMINAL`, `mlConfidence: 0.99`, and a `securitySeal` with `hmacSha256: '0x8f4a19b2e041'` and `tamperStatus: 'AUTHENTIC'`. Its `timestamp` is the constant `1773220800000` (2026-03-11T09:20:00Z), which is also `SEEDED_BASE_EPOCH` in `lib/anomalyLogic.ts:113` — roughly six months stale relative to the current date, and frozen because `makeFallback` never advances it.

The replacement state must state plainly that no observation has been received, and name the station. It must not display a classification, an alert level, or any security field.

### 3.2 Strict station resolution

`lib/stationData.ts:93`:

```ts
export const getStationProfile = (id: string): IMDStationProfile =>
  IMD_AWS_STATIONS.find(s => s.stationId === id) || IMD_AWS_STATIONS[0];
```

This never returns `undefined`. Any unrecognised ID silently resolves to station #0.

**Change:** add a strict sibling that can return `undefined`:

```ts
export function findStationProfile(id: string): IMDStationProfile | undefined {
  return IMD_AWS_STATIONS.find(s => s.stationId === id);
}
```

Use it at the two UI resolution points only:
- `app/dashboard/page.tsx:411` — `activeStation` resolution
- `app/mobile/page.tsx:424` — `handleResetToNominal` baseline

`getStationProfile` keeps its current behaviour for its 8 existing call sites (4 in `anomalyLogic.ts`, 1 in `api/telemetry/route.ts`, plus the two above). Making the existing function strict would require null-handling at all 8 and risks the WMO engine's behaviour; the strict variant gives the same guarantee where it matters without that blast radius.

When resolution fails, render a real empty state. **Never** fall back to station #0.

### 3.3 Fault injection must be visible when paused

`app/dashboard/page.tsx:419`:

```ts
const triggerAndTick = (fn, id) => { fn(id); if (isPaused) processNextTick(); };
```

`processNextTick` is gated *behind* `isPaused`, but the autonomous tick interval returns early when paused. Net effect: injecting a fault while paused updates nothing on screen, and the button appears broken.

**Change:** run the tick unconditionally after injection.

```ts
const triggerAndTick = (fn, id) => { fn(id); processNextTick(); };
```

Pause should stop the *autonomous* tick loop, not manual user actions.

### 3.4 Surface live-API failure

`app/dashboard/page.tsx:142-155` swallows all errors:

```ts
} catch { /* Graceful fallback */ } finally { setIsSyncingLive(false); }
```

Combined with §3.1's removal, a failed sync currently leaves the user with no data and no explanation. Distinguish three states: syncing, synced, and **failed to reach the live API** — with the station named and a retry affordance.

### 3.5 High-contrast mode

`app/globals.css:127-141` applies `background: #000; color: #ffff00` via `body.high-contrast *`, then repeats it for `header, nav, table, th, td, div`. Because the civic panels are `<div>` elements, the entire console inverts to black-on-yellow.

**Change:** rewrite as a token override implementing the spec's `#000` on `#FFFFFF`. Because it overrides tokens rather than elements, it inherits to every component without per-component work, and it stops clobbering the civic design.

**Component caveat:** overriding tokens only reaches components that consume the tokens. The 13 dark-theme files listed as out of scope use raw Tailwind palette classes and will not respond. For those, the `!important` on the existing selectors must be kept alongside the token block, so the toggle still does something everywhere. Removing the `!important` selectors is tied to completing the theme migration and belongs with that work.

### 3.6 Font-scale persistence

`app/dashboard/page.tsx:388-394` writes `document.documentElement.style.fontSize` with no persistence and no cleanup, so the setting resets on reload while everything else in the app persists, and leaks on navigation.

**Change:** persist to `localStorage`, and set via a `data-` attribute rather than an inline style so it can be cleared and overridden.

### 3.7 One-tap marker → telemetry on mobile

Clicking a marker opens a bottom sheet (`AWSNetworkMap.tsx:289`) and the console is hidden by `mobileSubView`, requiring a second tap on "Inspect in Dashboard" (line 672). Desktop does this in one click.

**Change:** on mobile, selecting a node also sets `mobileSubView` to `'telemetry'`. The bottom sheet's existing button remains as the explicit path.

### 3.8 Mobile QR button selects the live node

`app/dashboard/page.tsx:573` hardcodes `setSelectedStationId('AWS-MOB-01')`. If a phone auto-provisioned as `AWS-MOB-37`, the button jumps to the generic Delhi profile instead.

**Change:** select the most recent connected `AWS-MOB-*` node, falling back to `'AWS-MOB-01'` only when none exist.

### 3.9 Remaining defects

| Defect | Location | Fix |
|---|---|---|
| Auto-stream never settles — effect deps include `temp`/`press`/`humidity`, restarting the 2.5 s timer on every sync | `app/mobile/page.tsx:384` | Read values through a ref so the interval is created once |
| New `AudioContext` per chime, never closed; Chrome caps concurrent contexts near 6, so audio fails silently after ~15 s of auto-stream | `hooks/useMobileSensors.ts:227` | Create one context lazily and reuse it |
| Battery `levelchange`/`chargingchange` listeners never removed | `hooks/useMobileSensors.ts:202-203` | Return cleanup |
| `AWS-MOB-11..99` resolve to station #0's baseline, so "Reset to Nominal" resets a Delhi phone to a Chhattisgarh climate | `lib/stationData.ts:70` | Generated field-node IDs fall back to the `AWS-MOB-01` mobile profile (see below) |

**On the last row — a real product decision, not a pure bug.** A technician may legitimately stand at an arbitrary AWS site, and forcing a single ID discards that. The proposed resolution: generated field-node IDs fall back to the `AWS-MOB-01` mobile profile (correct climate: field-transmitter, not a Chhattisgarh station), and selecting a real city in the picker still adopts that city's catalog profile. Confirmed against §3.2 — that strict lookup returns `undefined` for these IDs rather than station #0, so the fallback is explicit rather than accidental.

### 3.10 Server-side drift clamp

`lib/anomalyLogic.ts:439` accumulates `driftOffset` without bound:

```ts
const updated = Math.round((current + pressureOffset) * 100) / 100;
```

Repeated bench calibration walks the offset arbitrarily far from zero. Clamp to a physically plausible range (proposed ±5 hPa; confirm at review).

### 3.11 Unused engine triggers

`handleInjectFreeze` (`app/mobile/page.tsx:409-413`) only chimes and re-transmits current values — it injects nothing, despite `triggerWireDisconnectFreeze` existing at `anomalyLogic.ts:459`. Likewise `handleResetToNominal` resets local state but never calls the server's `resetToNominal` (line 464), so a quarantined node stays quarantined.

**Change:** call the corresponding engine methods. This is a client wiring gap, not missing backend.

---

## 4. Phase 1 — Token Layer

Add a Tailwind v4 `@theme` block to `app/globals.css` defining semantic tokens for the light civic palette, per the recommended design system for government interfaces:

| Token | Value | Role |
|---|---|---|
| `--ms-bg` | `#F8FAFC` | Page background |
| `--ms-surface` | `#FFFFFF` | Card |
| `--ms-ink` | `#020617` | Body text |
| `--ms-primary` | `#0F172A` | Navy — headers, primary actions |
| `--ms-accent` | `#0369A1` | Interactive accent |
| `--ms-border` | `#E2E8F0` | Dividers |
| `--ms-muted-ink` | `#475569` | Secondary text (7:1 on bg) |
| `--ms-destructive` | `#DC2626` | WMO Flag 4 — quarantined |

All Phase 2+ components consume these tokens, never raw hex.

**Additive by construction** — the 20 components already migrated to the light civic palette are unaffected. This finishes the intent of commit `5c009fc` for the mobile surface without regressing the others.

Contrast is asserted by test, not by eye (§8).

---

## 5. Phase 2 — Component Extraction

`app/mobile/page.tsx` becomes a composition root. Extracted into `components/mobile/`:

| Component | Responsibility |
|---|---|
| `FieldHeader` | Tricolour, masthead, uplink pill, audio mute |
| `GeoStrip` | GPS coordinates, accuracy, Sync button |
| `ValueTile` | Temperature / pressure / humidity tiles with sliders |
| `TransmissionPanel` | Send, auto-stream, DCP hex frame, offline queue |
| `TelemetryChart` | Pressure / elevation / gust chart, metric toggle |
| `StressPad` | 1-tap anomaly triggers |
| `WiringSchematic` | **New** — §3.2 spec features |
| `BenchCalibration` | **New** — §3.2 spec features |
| `ServerVerdict` | WMO flag, operational action, XAI attribution, copy JSON |

**The split is presentational only.** The contracts in `lib/offlineStorage.ts` (`OfflineTelemetryPacket`, 15 fields), `hooks/useMobileSensors.ts` (16 return values), `lib/anomalyLogic.ts` (`TelemetryPacket`, 18 fields), and `app/api/telemetry/route.ts` (14-field request, `{ success, latencyMs, compliance, data }` response) are **not modified**.

State and effects stay in the composition root or move to a new `hooks/useFieldNode.ts`; the sensor, offline, and anomaly hooks are consumed unchanged.

---

## 6. Phase 3 — Spec §4 Accessibility

A single `AccessibilityProvider` in `components/mobile/a11y/` owns three persisted preferences, exposed via `useA11y()`. State in `localStorage`; applied as `data-` attributes on `<html>` so CSS performs the cascade.

| Requirement (UIUXD §4) | Implementation |
|---|---|
| **Dynamic font rescaling** — 3 levels, 85/100/115% | `html[data-font-scale]` sets a root font-size multiplier. **Requires converting ~20 arbitrary `text-[9px]`–`text-[11px]` values to rem**, since arbitrary px values do not scale. This is the bulk of the mechanical work. |
| **High-contrast monochrome** | Token override, `#000` on `#FFF` per spec. Replaces the current yellow-on-black (see §3.5). |
| **Bilingual Hindi/English** | `lib/i18n.ts` with `en`/`hi` tables. All visible strings move into it, including DCP hex-frame labels and chart axes. |
| **Keyboard navigation & ARIA** | 14 `focus:outline-none` sites get real `focus-visible` rings. Two currently have **no replacement indicator at all** (`GovInstitutionalConsole.tsx:405`, `GoogleStitchAIToolsSuite.tsx:328`) — highest priority. Touch targets floor at 44×44 px. |

Additionally, `prefers-reduced-motion` is honored **nowhere** in the codebase. Twelve components animate via framer-motion, plus `animate-pulse` live indicators, an infinite `shimmer` keyframe (`globals.css:169`), and Leaflet map motion. Phase 3 adds a global reduced-motion guard.

**Also fixed in this phase:** the root `select-none` on `app/mobile/page.tsx:448` blocks text selection — awkward on a page that has a "Copy JSON" button. Removed; `select-none` is retained only on controls where it prevents accidental interaction.

---

## 7. Phase 4 — New Spec Features

### 7.1 `WiringSchematic`

Static inline SVG diagrams for **PT100 4-wire RTD** and **Vaisala barometer** wiring, per UIUXD §3.2. No network access — must work under the existing offline queue. Self-contained reference material with no state.

### 7.2 `BenchCalibration`

One-touch calibration verification after sensor replacement, per UIUXD §3.2.

**The endpoint already exists and is unused.** `app/api/telemetry/route.ts:111-133` handles `action: 'CALIBRATE_OFFSET'`, calls `applyFieldCalibration`, optionally resolves a work-order ticket, and returns a compliance-tagged response. No backend work is required — this is client wiring.

UI: technician ID, ticket ID (optional), pressure and temperature offsets. Requires a network round-trip, so it must degrade gracefully — see §7.3.

### 7.3 Error handling for new features

- **QR generation failure** — fall back to a manual-entry code display.
- **Calibration failure** — surface a retry affordance and keep the pending event in memory so it is not silently lost, consistent with how `saveReadingLocally` already behaves.

---

## 8. Testing

Vitest is configured with two existing suites (`anomalyEngine.test.ts`, `stationData.test.ts`).

**Phase 0 regression tests** (the point is to make these defects impossible to reintroduce):
- No fabricated packet when `packets` is empty — no classification, alert level, or security field rendered.
- `findStationProfile` returns `undefined` for an unknown ID, and the UI renders the empty state rather than station #0.
- `triggerAndTick` advances a tick while `isPaused === true`.

**Phase 3 tests:**
- Translation-table completeness — every key referenced in components exists in **both** `en` and `hi`.
- Contrast assertions for the light civic palette and the high-contrast mode, both ≥ 4.5:1 for body text.

---

## 9. Verification

Each phase is checked independently:

- **Phase 0** — no visual diff expected. Dev server plus the two existing suites plus the new regression tests.
- **Phase 1** — the 20 already-migrated components render unchanged.
- **Phase 2** — `page.tsx` drops to a composition root; telemetry, offline queue, and hardware hooks behave identically.
- **Phase 3** — every control reachable by keyboard with a visible focus indicator; all strings present in both languages; 44×44 px targets.
- **Phase 4** — `CALIBRATE_OFFSET` round-trips against `route.ts`; schematics render offline.

---

## Appendix A — Defect Inventory

Fourteen defects found by logic analysis. All are addressed in Phase 0.

| # | Defect | Location | Spec |
|---|---|---|---|
| 1 | Fabricated compliant packet with forged `securitySeal` shown for stations with no data | `GovObservationConsole.tsx:199` | §3.1 |
| 2 | `getStationProfile` never returns `undefined` — silent wrong-station render | `stationData.ts:93` | §3.2 |
| 3 | Fault injection while paused produces no visible change | `dashboard/page.tsx:419` | §3.3 |
| 4 | High-contrast is black-on-yellow, not the spec'd black-on-white | `globals.css:127-141` | §3.5 |
| 5 | Font scale not persisted; inline-style leak | `dashboard/page.tsx:388-394` | §3.6 |
| 6 | Live-API failure invisible | `dashboard/page.tsx:142-155` | §3.4 |
| 7 | Mobile needs two taps to reach telemetry | `AWSNetworkMap.tsx:289, 672` | §3.7 |
| 8 | Mobile QR button hardcodes `AWS-MOB-01` | `dashboard/page.tsx:573` | §3.8 |
| 9 | Auto-stream interval restarts on every value change | `mobile/page.tsx:384` | §3.9 |
| 10 | `AudioContext` created per chime, never closed | `useMobileSensors.ts:227` | §3.9 |
| 11 | Battery listeners never removed | `useMobileSensors.ts:202-203` | §3.9 |
| 12 | `AWS-MOB-NN` generated IDs resolve to a Chhattisgarh station's baseline | `stationData.ts:70` | §3.9 |
| 13 | Drift offset accumulates unbounded — repeated calibration walks it arbitrarily far | `anomalyLogic.ts:439` | §3.10 |
| 14 | `handleInjectFreeze` and `handleResetToNominal` never call the engine | `mobile/page.tsx:409-437` | §3.11 |

Found during analysis, **not** in scope for any phase. Listed so they are not lost:

- `packetCounter` increments before checking `res.ok`, so a 429 reads as a successful transmit (`mobile/page.tsx:330`).
- Device detection tests `userAgent.includes('iPhone')` only — iPads report as Android (`mobile/page.tsx:309`).
- Elevation is derived from sea-level pressure, plotting absolute altitude as a "delta" (`mobile/page.tsx:134`).
- `handleFontSize` also affects all 12 dark-theme files app-wide, so persisting it (§3.6) changes their type size too. Expected and desirable; noted because it is a visible change in a phase otherwise claimed to be visually silent.

---

## Appendix B — Open Questions for Review

1. **§3.9, row 4** — the spec proposes that generated field-node IDs fall back to the `AWS-MOB-01` mobile profile rather than being constrained to the catalog. A technician at an arbitrary site is recorded under a generic mobile profile instead of a wrong one. Confirm, or prefer the stricter constraint.
2. **§3.10** — proposed drift clamp is ±5 hPa. Is that the right physical bound for a field barometer, or should it be tighter?
3. **§3.5** — the `!important` element selectors must stay until the dark-theme migration completes (§1 Non-goals). Confirm that a partial high-contrast mode is acceptable, or pull the migration into scope.
4. **Non-goals** — confirm the zoom lock and the 13 dark-theme files stay out of scope.
5. **Unresolved** — the original report was that clicking a station marker "shows view in telemetry console" without specifying the symptom. Two candidates are fixed here: **wrong data** (§3.2, silent fallback to station #0) and **two taps on mobile** (§3.7). If the actual symptom is different, tell me what is seen and Phase 0 needs a different fix.
