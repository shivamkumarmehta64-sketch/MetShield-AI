# Changelog: MetShield AI (SIH26073)

All notable changes to Project MetShield AI (NAWS-QMS v4.2) for the Smart India Hackathon 2026.

## [v4.2.9] - 2026-10-01 (SIH 2026 Refactor & Production Hardening)

### Added
- **NIC/MoES 65/35 Split Canvas (`RealTimeQCCanvas.tsx`)**:
  - Mounted directly at `/` (`app/page.tsx`).
  - GIGW accessibility controls: Font scaling (`A-`, `A`, `A+`) and bilingual switch (`EN` / `हिन्दी`).
  - Hero Telemetry strip showing dry-bulb temperature, reduced atmospheric pressure (QNH), and relative humidity.
  - Live Mobile Hardware Feed badge reacting to phone Generic Sensor API (`window.PressureSensor`).
  - Left Canvas (65%): Unified Recharts time-series container with interactive layer toggles (`Temp`, `Pressure`, `Humidity`), WMO reference boundary lines, and live anomaly markers.
  - Right Canvas (35%): Real-Time Incident Stream with SHAP/XAI attribution bars (`Temp %`, `Pressure %`, `Humidity %`), diagnostic notes, and automated moving-average imputation status.
  - Stealth Diagnostic Drawer: `[🔧 Field Diagnostic & Bench Test Tool (Authorized Personnel Only)]` with simulation triggers for Thermistor Open-Circuit, Probe Float Lock, and Convective Front Dynamics.
- **Hook `useLiveNetwork.ts`**:
  - Background telemetry poller with page visibility guard (`document.visibilityState === 'hidden'`).
  - Per-station staleness tracker (flags `STALE` when age $> 3\times$ interval).
- **GitHub Actions CI Workflow (`.github/workflows/ci.yml`)**:
  - Automated CI running Node 20.x, `npm run verify` (lint + typecheck + tests), and Next.js production build.
- **Data Provenance Taxonomy (`lib/dataProvenance.ts`)**:
  - Added `StationDataSource`: `LIVE_DEVICE`, `PUBLIC_MODEL_API`, `REPLAY`, `SIMULATED`, `BENCHMARK`.

### Changed
- **Software License**: Switched from `CC BY 4.0` to official permissive `MIT` in `package.json`.
- **WMO Limits Text Alignment**: Updated `components/landing/HowMetshieldDecidesBand.tsx` to quote exact engine constants ($-10$ to $55^\circ\text{C}$, $300$ to $1085\text{ hPa}$, $5$ to $100\%$ RH) rather than unverified ranges.
- **Incident Status Logic (`lib/networkFeed.ts`)**: Corrected `status` resolution so that open drifts/faults remain `ACTIVE` until the station actually clears, preventing premature `RECOVERED` tags on active sequences.
- **Audit Log CSV Export (`app/dashboard/page.tsx` & `RealTimeQCCanvas.tsx`)**: Replaced hardcoded dummy strings with official 8-column `generateAuditCsvContent(getAuditLogRecords())` featuring CWE-1236 spreadsheet formula injection neutralization.
- **Station ID Correction (`scripts/mock_streamer.py`)**: Fixed `AWS-CHE-03` to registered Chennai station ID `AWS-CHN-03`.
- **Vite Deprecation Notice (`vitest.config.ts`)**: Migrated `path.resolve(__dirname, './')` to `path.resolve(import.meta.dirname, './')`.
- **Pruned Vinext Deployment Scripts**: Removed experimental Cloudflare Vinext commands from `package.json` to standardize on Vercel deployment (`aws2026-nu.vercel.app`).
- **Legal Compliance Phrasing**: Replaced official ministry header branding with `"Prototype for MoES/IMD Problem Statement SIH26073 | Team AEROTECH1"` to respect Emblems and Names Act protocols.

### Maintained & Verified
- Retained **"MetShield AI"** as the primary brand name, matching the submitted SIH PPT (`SIH FINISHED 5.pptx` Slides 2 & 6) and repository identity.
- Passing **20/20 test files, 210/210 tests** with zero warnings or errors.
