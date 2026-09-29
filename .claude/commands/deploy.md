---
description: Prepare and verify a MetShield deployment, then ask before publishing
---

Prepare a MetShield deployment. **Never publish without explicit confirmation in the
conversation** — a deploy is outward-facing and hard to reverse.

1. **Gate first.** Nothing deploys until this is green:
   ```bash
   npm run verify
   npm run build
   ```

2. **Check the environment.** `METSHIELD_STATION_CREDENTIALS` must be set in the target
   environment. Without it `POST /api/telemetry` refuses every write with 503 — correct
   fail-closed behaviour, but it means the telemetry write path is dead in production.
   `OPENAI_API_KEY` is optional; absent, `/api/ai/*` serve deterministic responses from `lib/`.
   See `.env.example`.

3. **Targets.**
   - Vercel: `vercel.json`, `npm run build`
   - Cloudflare Workers: `npm run cf:deploy` (wrangler), or the `vinext` scripts (`build:vinext`, `deploy:vinext`)

4. **Post-deploy checks.** Load the deployed routes and confirm:
   - no console errors
   - `/api/weather` returns live data
   - the data-mode badge matches `DATA_MODE` in `lib/networkFeed.ts`
   - simulated values still carry their provenance badge

5. **Report** the target, the commit, the route count, and every check you ran — including
   the ones you could not run. Do not claim a deployment succeeded without a live check
   against the deployed URL.

Note: `vercel` CLI is not currently installed (`npm i -g vercel` unlocks `vercel deploy`,
`vercel env pull`, `vercel logs`).
