# Implementation & Deployment Guide

## 1. Technology Stack
- **Framework:** Next.js 16 (App Router paradigm).
- **Language:** TypeScript 5.x (Strict mode enabled).
- **Styling:** Tailwind CSS + Radix UI Primitives (Accessible UI).
- **State/Polling:** SWR / React Query + `lib/vayuPoller.ts`.
- **Maps:** Leaflet / React-Leaflet (Client-side rendered mapping).
- **Testing:** Vitest (In-memory testing for anomaly detection bounds).

## 2. Directory Structure & Key Files
- `app/` - Next.js 16 routing core.
  - `page.tsx` - Institutional Landing Page.
  - `dashboard/page.tsx` - Operations Command Room.
  - `mobile/page.tsx` - PWA mobile device node interface.
  - `api/` - Edge-native REST API ingestion routes.
- `components/` - Atomic UI elements (Buttons, Cards, Modals) and complex Layouts (Maps, LiveCharts, Telemetry feeds).
- `lib/` - Core scientific & meteorological business logic (Framework Agnostic).
  - `anomalyDetector.ts` - Tiered logic assessing WMO boundary invariants.
  - `anomalyLogic.ts` / `mlAnomalyModel.ts` - Heuristic classifiers.
  - `india766Districts.ts` - Standardized baseline constants for 766 Indian districts.
- `__tests__/` - Core test harness for ensuring 0% severe-weather misclassification.

## 3. Local Development Steps
1. **Clone & Install**
   ```bash
   git clone <repository_url>
   npm install
   ```
2. **Environment Variables**
   Create a `.env.local` containing:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   # Toggle for simulated vs live ingestion
   USE_SIMULATED_TELEMETRY=true
   ```
3. **Run Dev Server**
   ```bash
   npm run dev
   ```

## 4. Testing & Validation (Vitest)
The scientific core depends strictly on regression testing to avoid false quarantines of genuine squall lines. Run test suites locally before committing:
```bash
npm test
# OR for benchmarks
npm run bench
```
Ensure that macro F1 scores remain >98% for simulated edge-fault telemetry.

## 5. Deployment 

### 5.1 Vercel Edge / Serverless Deploy (Current Platform)
MetShield AI runs out-of-the-box on Vercel Fluid Compute.
1. Connect via Vercel GitHub integration.
2. Ensure framework preset is `Next.js`.
3. Overrides: None required.
4. Scale limits: Bump function execution timeouts to 300s if running batch geospatial map clustering.

### 5.2 National Informatics Centre (NIC MeghRaj) Containerization
For sovereign institutional deployments (on-prem):
1. Wrap the output of `next build` inside a `node:18-alpine` Dockerfile.
2. Enforce strict HTTPS/TLS offloading at the Ingress controller level.
3. Replace Vercel KV / Edge Config with in-memory Redis clusters provisioned by the Government Cloud Infrastructure.

## 6. Maintenance Routines
Check `OPERATIONAL_RUNBOOK_AND_MAINTENANCE.md` for daily operator checklists and database cleanup strategies (e.g., cron jobs to dump historical telemetries to cold-storage parquet files after 90 days to minimize SQL indices costs).
