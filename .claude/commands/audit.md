---
description: Audit the MetShield AI application for correctness, data integrity, and UI defects
---

Audit the entire MetShield AI application.

**Do not modify code initially.** Investigate, then report.

Inspect:
- architecture and data flow (AWS → ingestion → QC → AI detection → flag/correction)
- routes (`/`, `/dashboard`, `/incidents`, `/analytics`, `/audit-report`, `/stations`, `/mobile`, `/demo`)
- API routes (`/api/*`) — auth, rate limits, error paths
- `lib/anomalyLogic.ts` — the QC engine, flags, XAI weights, imputation
- presentation layer — hardcoded KPIs, `Math.random()` labelled LIVE, station IDs absent from `lib/stationData.ts`
- data integrity — any simulated value presented as real; check `lib/dataProvenance.ts` and `DATA_MODE` in `lib/networkFeed.ts`
- claims in UI copy vs. what the code actually implements (see `README.md` §13)
- TypeScript errors, lint errors, failing tests
- console errors, responsive layout, visual consistency, accessibility

Verification rules that apply to this audit:
- **Reading source is not verification.** Where a finding concerns runtime behaviour, write and run a probe (`scripts/verify-*.ts`, or `tsx`).
- **A guard test reporting zero violations is not evidence it works.** For any guard test you assess, inject the defect it guards against and confirm it fails.
- Verify a station ID exists in `lib/stationData.ts` before reporting it as phantom.

Return:
1. Critical issues (data integrity, false claims, auth, broken routes)
2. Medium issues
3. Minor issues
4. Recommended implementation order

For each finding: `file:line`, what is wrong, how you verified it, and the smallest correct fix.
