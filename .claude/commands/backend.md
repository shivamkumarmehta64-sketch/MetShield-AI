---
description: Change a MetShield API route, engine module, or auth path
---

Change backend code on MetShield.

1. **Trace before writing.** Read the route, the engine it calls, and every caller. `grep` for the symbol — do not infer behaviour from filenames.

2. **Preserve the QC contract.** `lib/anomalyLogic.ts` is the WMO Pub No. 8 engine and the centre of the product.
   - Storm discrimination is the coupled invariant: ΔP ≤ −2.5 hPa **and** ΔRH ≥ +15 **and** ΔT ≤ −1.5. A pressure drop alone is drift.
   - Changing that threshold is a domain decision. Flag it; do not quietly tune it.
   - `WMOQualityFlag` and `RootCauseClassification` unions are the public contract. Changing a member breaks every consumer.

3. **Fail closed on auth.** `POST /api/telemetry` is protected by per-station PSK in `lib/auth.ts`. When `METSHIELD_STATION_CREDENTIALS` is unset or every key is dropped, the route returns **503**, not 401 — the cause is server misconfiguration, not a bad credential. **Never add a demo bypass.** An unconfigured deployment must be closed, not open.

4. **Keep limits on the AI routes.** `lib/rateLimit.ts` and `lib/aiLimits.ts` bound `/api/ai/*` and `/api/assistant` (10 req/min, 2000-char prompt). Any new public route needs the same treatment.

5. **Data integrity.** Never fabricate meteorological data. If a field is unavailable, emit `null` and render N/A. When a simulated source is added, register it in `lib/dataProvenance.ts` as `SIMULATED`.

6. **Verify with a runtime probe.** Reading source is not verification, and the worst bugs in this repo were invisible in source and typecheck-clean. Write a probe (`scripts/verify-*.ts`, run with `tsx`) and run it. For a new test, inject the defect it guards against, confirm it FAILS, then restore.

7. **Gate.**
   ```bash
   npm run verify
   ```

Report: what changed, which probe you ran and its output, and anything you deliberately left alone.
