# UI/UX Design Specification & Design System (UIUXD)
## National Automatic Weather Station Quality Management System (MetShield-QMS v4.2)
### Problem Statement SIH26073 | Ministry of Earth Sciences (MoES) & India Meteorological Department (IMD)
**Author: Lead UI/UX Designer & Accessibility Specialist | Version: 5.0 Production Candidate**

---

## 1. Executive Design Philosophy: The "Dual-DNA" Interface

MetShield-QMS v4.2 combines two visual identities into a single cohesive experience:

1. **Sovereign Government Authority (GIGW v3.0 & NIC Guidelines)**:
   - Designed to meet the mandatory **Guidelines for Indian Government Websites (GIGW v3.0)**.
   - Features the official **Ashoka Blue (`#002147`)** and **India Saffron (`#FF9933`)** accents.
   - Incorporates accessibility controls: dynamic font scaling ($A-, A, A+$), high-contrast toggle, bilingual Hindi/English localization, and national emblem branding.
   - Conveys trust, institutional gravitas, and national sovereignty.

2. **High-Density Cybernetic Surveillance & Live Cockpit**:
   - High-density data grid inspired by modern mission control and meteorological surveillance consoles.
   - Dynamic real-time Recharts telemetry curves updating smoothly every 2.5 seconds.
   - Explainable AI (XAI) parameter attribution bars showing root-cause blame percentages ($T\%, P\%, RH\%$).
   - Interactive Bench Calibration Drawer for instant fault injection during live evaluation.

---

## 2. Design Tokens & Visual Hierarchy

### 2.1 Color Palette & WMO Semantic Tokens

| Token Name | Hex Code | Semantic Role & Operational Meaning |
| :--- | :---: | :--- |
| **Ashoka Blue** | `#002147` | Primary sovereign brand color, government banner, table headers, and authority accents. |
| **India Saffron** | `#FF9933` | Secondary national accent, active navigation indicator, top separator bar. |
| **Canvas Background** | `#F1F5F9` | Neutral slate background engineered to minimize eye strain during 24/7 watch shifts. |
| **Card Surface** | `#FFFFFF` | Crisp white card surface with subtle border delineation (`#E2E8F0`). |
| **WMO Flag 1 (Nominal)** | `#10B981` | Emerald Green: Verified Good, sensors operating within nominal diurnal bounds. |
| **WMO Flag 2 (Convective)** | `#F59E0B` | Amber/Gold: Genuine Convective Storm, data validated for NWP assimilation. |
| **WMO Flag 3 (Drift)** | `#D97706` | Ochre/Amber: Calibration Drift detected, recalibration ticket dispatched. |
| **WMO Flag 4 (Hardware)** | `#EF4444` | Crimson Red: Corrupt Hardware, open-circuit spike or stuck ADC, immediate quarantine. |
| **WMO Flag 5 (Packet Drop)**| `#8B5CF6` | Royal Violet: Telemetry packet loss or antenna fade, RF link verification required. |

### 2.2 Typography System
- **Primary Interface Font**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif` — Engineered for high legibility at dense 11px–13px data displays.
- **Telemetry Digits & Code Identifiers**: `JetBrains Mono`, `Roboto Mono`, `ui-monospace`, `monospace` — Tabular lining figures ensuring that numbers do not shift horizontally when updating in real-time every 2.5 seconds.

### 2.3 Spatial Grid & Layout Architecture
- **Desktop Container Max-Width**: `1750px` for multi-column visibility on standard $1080\text{p}$ and $1440\text{p}$ widescreen monitors.
- **Mobile Container Width**: Fluid $100\%$ with responsive padding ($12\text{px}-16\text{px}$) for thumb-friendly single-column operation on smartphones ($375\text{px}-430\text{px}$).
- **Elevation**: Subtle borders (`border border-slate-200`) and soft shadows (`shadow-sm`) preserving a clean, functional government software aesthetic without decorative clutter.

---

## 3. Screen Layouts & Component Hierarchy

### 3.1 Desktop Operator Cockpit (`/dashboard`)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [GovHeader] National Emblem | MoES / IMD Title | GIGW Controls (A- A A+, HI) │
├─────────────────────────────────────────────────────────────────────────────┤
│ [GovNetworkStrip] 20 Stations | 98.4% Quality Index | Anomaly Counter Strip  │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────┬─────────────────────────────────────┐ │
│ │ [Station Overview & Status]       │ [Live Telemetry Curves (Recharts)]  │ │
│ │ • Active Station Dropdown (20)    │ • Synchronized Temperature curve    │ │
│ │ • Raw vs Imputed Indicators       │ • Barometric Pressure plunge curve  │ │
│ │ • Battery Voltage & Signal RSSI   │ • Relative Humidity surge curve     │ │
│ ├───────────────────────────────────┼─────────────────────────────────────┤ │
│ │ [XAI Parameter Attribution Panel] │ [Diagnostic Anomaly Register]       │ │
│ │ • Temp Blame Weight (e.g. 91.5%)  │ • 10-Packet Recent History Table    │ │
│ │ • Press Blame Weight (e.g. 4.2%)  │ • WMO Flags & HMAC Audit Seal       │ │
│ │ • Hum Blame Weight (e.g. 4.3%)    │ • Action Taken / Work Order #       │ │
│ └───────────────────────────────────┴─────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Bench Calibration Drawer] One-Click Fault & Storm Injection for Jury Test  │
├─────────────────────────────────────────────────────────────────────────────┤
│ [GovFooter] Official Government of India Disclaimer | NIC / MoES Portal     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile Field Technician Companion (`/mobile`)
- **Single-Column Touch Layout**: Designed for one-handed operation in the field under direct sunlight.
- **High-Contrast Value Tiles**: Large tabular numbers for Temperature, Pressure, and Humidity.
- **Offline Wiring Schematics**: Direct visual wiring diagram for PT100 4-wire RTD and Vaisala barometers.
- **Bench Calibration QR & Reset**: One-touch button to trigger calibration verification after physical sensor replacement.

---

## 4. Accessibility & Inclusive Design (GIGW v3.0 & WCAG 2.1 AA)

1. **Color Contrast**:
   - All text elements achieve a minimum contrast ratio of $4.5:1$ against their background; large headers achieve $>7:1$.
2. **Dynamic Font Rescaling**:
   - The interface provides three font-size levels ($A-$: 85%, $A$: 100%, $A+$: 115%) without breaking page layouts or causing overlapping containers.
3. **High-Contrast Monochrome Mode**:
   - One-click toggle transforms the entire interface into high-contrast black-and-white (`#000000` on `#FFFFFF`) for visually impaired operators.
4. **Bilingual Support (Hindi & English)**:
   - Instant language switcher translating all navigation links, alerts, and table headers into Hindi (`हिन्दी`) and English.
5. **Keyboard Navigation & ARIA**:
   - All interactive elements (station dropdowns, tabs, bench buttons) include explicit `aria-label`, focus rings (`focus:ring-2 focus:ring-blue-500`), and full keyboard tab stops.
