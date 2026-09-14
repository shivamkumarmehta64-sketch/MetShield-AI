# Product Requirements Document (PRD)
## National Automatic Weather Station Quality Management System (MetShield-QMS v4.2)
### Problem Statement SIH26073 | Ministry of Earth Sciences (MoES) & India Meteorological Department (IMD)
**Author: Lead Product & Systems Architect | Version: 5.0 Production Candidate**

---

## 1. Document Control & Executive Summary

| Field | Value |
| :--- | :--- |
| **Product Name** | **MetShield-QMS** (*Joint Atmospheric Telemetry & Anomaly Unification - Quality Management System*) |
| **Target Release** | Version 5.0 (SIH 2026 Production Candidate & Ministry Deployment) |
| **Sponsoring Agency** | Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD) |
| **Problem Statement ID** | **SIH26073** |
| **Document Purpose** | Comprehensive specification defining product strategy, user personas, functional and non-functional requirements, edge/cloud deployment architectures, and acceptance verification criteria. |

---

## 2. The Core Problem & Strategic Vision

### 2.1 Problem Background
The India Meteorological Department (IMD) operates a nationwide network of over 1,200+ Automatic Weather Stations (AWS) transmitting surface atmospheric telemetry—including Ambient Temperature ($T, ^\circ\text{C}$), Barometric Pressure ($P, \text{hPa}$), Relative Humidity ($RH, \%$), Wind Speed/Direction, and Rainfall—via INSAT-3D Data Collection Platforms (DCP) and cellular GPRS links.

These observations directly feed India's Numerical Weather Prediction (NWP) models (NCMRWF GFS/WRF) and severe weather early warning systems. However, current automated QC systems suffer from two fatal operational flaws:

1. **The "Catastrophic False Positive" (Convective Storm Blind Spot)**:
   - Violent pre-monsoon squalls (Kalbaisakhi, Nor'westers, Haboobs) trigger abrupt barometric drops ($\Delta P \le -2.0\text{ hPa}$ in 15 min) and evaporative temperature plunges ($\Delta T \le -3.0^\circ\text{C}$).
   - Naive single-parameter threshold QC algorithms misclassify this sudden gradient as a failing sensor or open-circuit spike, reject the packet, quarantine the station, and **suppress life-saving disaster early warnings!**
   - Simultaneously, unwarranted emergency field maintenance teams are dispatched to remote locations at high cost ($> ₹15,000$ per wasted trip).

2. **The "Silent False Negative" (Undetected Sensor Degenerations)**:
   - Gradual calibration drifts in capacitive barometers ($-0.3\text{ hPa/day}$), frozen analog-to-digital converter (ADC) registers, or intermittent telemetry packet drops go unnoticed for weeks.
   - Corrupt telemetry silently pollutes the NWP atmospheric data assimilation grid, degrading forecast accuracy nationwide.

### 2.2 Product Vision
Build an **autonomous, zero-operating-cost (₹0), edge-delivered quality management system** that:
- Ingests real-time telemetry every 2.5 seconds at line-rate ($<1\text{ms}$).
- Employs a **Coupled Thermodynamic Convective Coupler** to distinguish genuine extreme storm fronts from hardware transducer faults with $>99.8\%$ accuracy.
- Delivers **Explainable AI (XAI)** attribution formulas (Zahumenský § 4.3) showing exact parameter-level blame ($W_T\% + W_P\% + W_{RH}\% = 100\%$).
- Reconstructs corrupted or missing data using WMO-compliant spatial-temporal imputation before feeding numerical weather prediction models.
- Operates under a **Dual-Platform Architecture** (Vercel Next.js 16 Node runtime + Cloudflare Workers vinext edge runtime) with zero vendor lock-in.

---

## 3. Target User Personas & Core Workflows

### 3.1 Persona 1: Dr. Rajesh Sharma — Senior Duty Meteorologist (RMC Division Chief)
- **Role**: Oversees regional meteorological surveillance across Northern India (50+ AWS stations).
- **Core Need**: Instant visual discrimination between sudden convective storm fronts and equipment failures without false panic alarms.
- **Workflow**: Accesses the National AWS Cockpit (`/dashboard`) $\to$ Sees regional network status strip $\to$ Receives high-priority storm advisory marked *"Validated for NWP Assimilation"* with zero false alarms.

### 3.2 Persona 2: Vikas Verma — Senior Field Instrumentation Technician
- **Role**: On-site diagnostic repair and transducer calibration across remote observatory stations.
- **Core Need**: Rapid identification of failing physical components without hours of manual multimeter probing.
- **Workflow**: Accesses Mobile Companion (`/mobile`) $\to$ Reads XAI parameter blame ($T=91.5\% \implies$ RTD thermistor discontinuity) $\to$ Replaces designated PT100 probe on first attempt $\to$ Inputs bench calibration code to close ticket.

### 3.3 Persona 3: Ananya Sen — NWP Numerical Data Assimilation Engineer (NCMRWF)
- **Role**: Ingests observational surface telemetry into high-resolution WRF/GFS forecast models.
- **Core Need**: Continuous, clean, gap-free observational matrices where missing or corrupted values are seamlessly imputed.
- **Workflow**: Subscribes to MetShield-QMS clean telemetry stream (`/api/telemetry`) $\to$ Ingests data streams tagged with WMO Quality Flags, utilizing reconstructed values (`imputed.wasCorrected = true`).

### 3.4 Persona 4: SIH Hackathon Evaluation Jury
- **Role**: Validates innovation, algorithmic accuracy, edge scalability, and cost efficiency.
- **Core Need**: Real-time interactive verification of all failure modes and storm scenarios.
- **Workflow**: Uses interactive Bench Injection Drawer to trigger Thermistor Spike, Stuck ADC Freeze, Barometer Drift, or Convective Storm $\to$ Observes instant classification, sub-1ms response, and XAI parameter attribution.

---

## 4. Functional Requirements (FR)

| ID | Priority | Feature Module | Functional Specification | Acceptance Criteria |
| :--- | :---: | :--- | :--- | :--- |
| **FR-01** | **P0** | **Multi-Parameter Telemetry Ingestion** | Ingests Temperature ($T$), Pressure ($P$), Humidity ($RH$), Wind Speed/Direction, and Rainfall every 2.5s. | Validates ranges ($T \in [-10, 55]^\circ\text{C}$, $P \in [920, 1050]\text{ hPa}$, $RH \in [5, 100]\%$) and handles null payloads. |
| **FR-02** | **P0** | **Coupled Convective Storm Classifier** | Evaluates thermodynamic coupling: $\Delta P \le -1.5\text{ hPa} \land \Delta RH \ge +8\% \land \Delta T \le -0.5^\circ\text{C}$. | Assigns **WMO Flag 2 (Convective Storm)**, marks *"Validated for NWP Assimilation"*, and suppresses false field dispatches. |
| **FR-03** | **P0** | **Hardware Fault Detection Suite** | Detects: (1) Thermistor open-circuit spikes ($|\Delta T| > 3.2^\circ\text{C}$), (2) Stuck ADC registers ($\sigma^2 < 10^{-8}$ over 6 ticks), (3) Monotonic barometer drift ($> 1.2\text{ hPa}$ deviation), and (4) Telemetry packet drops. | Flags faults with **WMO Flag 4** (Corrupt Hardware) or **WMO Flag 3** (Suspect Drift) and quarantines corrupt channels. |
| **FR-04** | **P0** | **Explainable AI (XAI) Attribution** | Computes normalized parameter contribution using Zahumenský § 4.3 feature importance ($W_T + W_P + W_{RH} = 100\%$). | Emits graphical attribution bars and diagnostic text indicating the specific physical probe responsible. |
| **FR-05** | **P0** | **Automated WMO Data Reconstruction** | Replaces quarantined values using 6-sample weighted moving averages (WMA) and regional baseline offsets. | Reconstructed observation is continuous and within physical boundaries; `wasCorrected` set to `true`. |
| **FR-06** | **P1** | **Spatial KNN Cross-Validation** | Cross-validates anomalies against $k=3$ nearest stations within 500km using Haversine distance weighting. | Distinguishes isolated single-node sensor faults from widespread regional synoptic events (`REGIONAL_WEATHER`). |
| **FR-07** | **P1** | **Cryptographic Zero-Trust Seal** | Computes HMAC-SHA256 signature, anti-replay nonces, and Merkle audit roots for each packet. | Rejects tampered payloads with `tamperStatus = SIGNATURE_MISMATCH`. |
| **FR-08** | **P1** | **Automated Work-Order Dispatch** | Constructs Common Alerting Protocol (CAP v1.2) JSON/XML payloads with unique ticket IDs (`IMD-QMS-2026-XXXX`). | Work orders dispatched with station profile, GPS coordinates, and diagnostic instructions. |
| **FR-09** | **P1** | **Interactive Bench Injection Drawer** | Allows operators and evaluators to inject all 5 fault scenarios into any of the 20 stations with one click. | Faults immediately reflected on the next observation cycle without server restart. |
| **FR-10** | **P2** | **GIGW & NIC Accessibility Compliance** | Bilingual Hindi/English toggle, font resizing ($A-, A, A+$), high-contrast mode, and official GoI visual styling. | Fully adheres to Guidelines for Indian Government Websites (GIGW v3.0). |

---

## 5. Non-Functional Requirements (NFR)

1. **Performance & Latency**:
   - Algorithmic evaluation latency $< 1.0\text{ ms}$ per packet.
   - API response time $< 15\text{ ms}$ over Edge CDN.
   - Client UI renders at $\ge 60\text{ fps}$ without jank during real-time 2.5s streaming.
2. **Availability & Resilience**:
   - 99.99% availability achieved via multi-cloud edge deployment (Cloudflare Anycast + Vercel Global Edge).
   - Stale-while-revalidate caching ensures zero user-facing downtime even during backend maintenance.
3. **Operational Cost**:
   - 100% Zero-Cost (₹0) serverless architecture utilizing free-tier allowances on Vercel and Cloudflare.
4. **Security & Privacy**:
   - Strict TLS 1.3 encryption in transit, CSP Level 3 headers, zero PII collection (DPDP Act 2023 compliant).
