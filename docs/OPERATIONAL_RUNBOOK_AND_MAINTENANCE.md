# Operational Runbook & Field Maintenance Standard (SOP)
## National Automatic Weather Station Quality Management System (MetShield-QMS v4.2)
### Problem Statement SIH26073 | Ministry of Earth Sciences (MoES) & India Meteorological Department (IMD)
**Author: Lead Instrumentation & Operations Engineer | Document ID: SOP-IMD-QMS-2026-01**

---

## 1. Operational Overview & Objective

This Standard Operating Procedure (SOP) governs the triage, automated ticketing, diagnostic verification, on-site physical maintenance, and sensor recalibration for Automatic Weather Stations (AWS) operated under the India Meteorological Department (IMD).

When the MetShield-QMS algorithmic engine identifies an unphysical sensor anomaly (`WMO Flag 3: Suspect Drift` or `WMO Flag 4: Corrupt Hardware`), it automatically suppresses the corrupt data from the Numerical Weather Prediction (NWP) feed, applies WMO-compliant reconstruction, and issues an authorized Common Alerting Protocol (CAP v1.2) Maintenance Work Order.

```
 [ Telemetry Packet Ingested ]
              │
              ▼
   [ MetShield-QMS Engine ]
   ├── Is Genuine Storm (Coupled ΔP, ΔT, ΔRH)? ──► [ YES ] ──► Feed NWP (Flag 2)
   └── [ NO: Transducer Anomaly ]
              │
              ├─ Flag 3: Barometer Drift
              ├─ Flag 4: Spike or Frozen ADC
              └─ Flag 5: Telemetry Packet Drop
              │
              ▼
   [ Automated Work Order Engine ]
   ├── Generate Ticket: IMD-QMS-2026-XXXX
   ├── Populate XAI Attribution (% Blame)
   ├── Lookup Station Profile (GPS, WMO Block, Model)
   └── Dispatch CAP v1.2 Payload via SMS / Email / NIC Portal
              │
              ▼
   [ Field Maintenance Workflow ]
   ├── Step 1: Regional Met Centre (RMC) Review
   ├── Step 2: Technician Dispatched to Station Benchmark
   ├── Step 3: Diagnostic Testing (PT100 / Barometer / Hygrometer)
   ├── Step 4: Transducer Replacement / NABL Recalibration
   └── Step 5: Digital Zero-Offset Calibration & Ticket Closeout
```

---

## 2. Anomaly Classification & Work-Order Priority Matrix

| Classification | WMO Flag | Gov Alert Level | Trigger Condition | Operational Action & SLA |
| :--- | :---: | :---: | :--- | :--- |
| **GENUINE_CONVECTIVE_EVENT** | **Flag 2** | `LEVEL_2_YELLOW` | Coupled plunge: $\Delta P \le -1.5\text{ hPa}$, $\Delta RH \ge +8\%$, $\Delta T \le -0.5^\circ\text{C}$. | **DO NOT DISPATCH FIELD TECHNICIAN.** Validate packet for NWP assimilation. Issue Severe Weather Advisory. |
| **SENSOR_SPIKE** | **Flag 4** | `LEVEL_4_RED` | $|\Delta T| > 3.2^\circ\text{C}$ or $T > 50^\circ\text{C}$ without barometric drop. | **CRITICAL (SLA: 24h).** Quarantine thermal channel. Inspect PT100 wiring harness, RTD amplifier, or animal cable chew. |
| **FROZEN_VALUE** | **Flag 4** | `LEVEL_4_RED` | Zero variance ($\sigma^2 = 0$) across $\ge 6$ consecutive observation cycles ($15\text{s}$). | **HIGH (SLA: 48h).** Quarantine channel. Reset microcontroller ADC register, check 4-20mA loop or SDI-12 bus lockup. |
| **CALIBRATION_DRIFT** | **Flag 3** | `LEVEL_3_AMBER` | Monotonic cumulative barometric deviation $> 1.2\text{ hPa}$ without synoptic gradient over 24h. | **MEDIUM (SLA: 7 days).** Apply software offset in imputation engine. Schedule NABL traveling reference barometer inspection. |
| **TELEMETRY_PACKET_LOSS** | **Flag 5** | `LEVEL_3_AMBER` | Null or missing payload across all 3 channels for $\ge 3$ consecutive ticks. | **MEDIUM (SLA: 48h).** Inspect solar panel charging circuit, battery terminal voltage, and INSAT-3D DCP / GPRS antenna alignment. |

---

## 3. Common Alerting Protocol (CAP v1.2) Specification

MetShield-QMS automatically constructs CAP v1.2 compliant JSON and XML payloads adhering to the National Disaster Management Authority (NDMA) and MoES standards:

```json
{
  "identifier": "IMD-QMS-2026-0814",
  "sender": "qms-alert@imd.gov.in",
  "sent": "2026-09-12T13:45:00+05:30",
  "status": "Actual",
  "msgType": "Alert",
  "scope": "Restricted",
  "info": {
    "category": "Met",
    "event": "Automated Weather Station Transducer Fault",
    "urgency": "Immediate",
    "severity": "Severe",
    "certainty": "Observed",
    "eventCode": { "valueName": "WMO_FLAG", "value": "FLAG_4_CORRUPT_HARDWARE" },
    "headline": "PT100 Temperature Probe Discontinuity at AWS-DEL-04 (Lodhi Road Observatory)",
    "description": "Unphysical temperature step change (+14.2°C in <5s) detected at Station AWS-DEL-04. XAI attribution assigns 91.5% blame to thermal transducer. Barometric and hygrometric channels remain nominal, ruling out severe convective activity.",
    "instruction": "Field technician must inspect the 4-pin Hirose connector, measure RTD resistance across terminals 1 & 3 (expected ~109.7 ohms at 25°C), and inspect radiation shield aspiration fan.",
    "area": {
      "areaDesc": "New Delhi, RMC Delhi, Block 42182",
      "circle": "28.5921,77.2205,5.0"
    },
    "parameter": [
      { "valueName": "XAI_TEMP_WEIGHT", "value": "91.5%" },
      { "valueName": "XAI_PRESS_WEIGHT", "value": "4.2%" },
      { "valueName": "XAI_HUM_WEIGHT", "value": "4.3%" },
      { "valueName": "IMPUTATION_ACTIVE", "value": "TRUE" }
    ]
  }
}
```

---

## 4. Step-by-Step Field Instrumentation Troubleshooting Protocols

### 4.1 Temperature Channel (PT100 / Class-A RTD Thermistor)
1. **Visual Inspection**:
   - Inspect solar radiation shield (Young / MetSpec multi-plate shield). Check for bird nesting, spider webs, or clogged aspiration louvers.
   - Inspect the neoprene-jacketed signal wire running down the mast. Check for pinch points or UV degradation.
2. **Electrical Resistance Bench Check**:
   - Disconnect 4-pin Hirose connector from datalogger input channel.
   - Connect calibrated digital multimeter (DMM) set to $200\,\Omega$ range across pins A & B.
   - Standard PT100 resistance formula:
     $$R(T) = R_0 (1 + A T + B T^2)$$
     - At $0^\circ\text{C} \implies 100.00\,\Omega$
     - At $25^\circ\text{C} \implies 109.73\,\Omega$
     - At $40^\circ\text{C} \implies 115.54\,\Omega$
   - If DMM indicates open circuit ($OL$) or resistance $>200\,\Omega$, replace the probe assembly immediately (`Part No. RTD-PT100-IMD`).

### 4.2 Barometric Pressure Channel (Vaisala PTB110 / Setra 278)
1. **Desiccant & Vent Inspection**:
   - Check the silica gel desiccant pack in the barometer enclosure. If desiccant has turned pink, replace with active blue crystals.
   - Ensure the static pressure port / Gortex venting tube is not clogged by fine dust or mud wasps.
2. **Traveling Reference Comparison**:
   - Connect a traveling NABL-calibrated reference barometer (e.g. Vaisala PTB330) adjacent to the station barometer.
   - Take 5 synchronized readings spaced 1 minute apart.
   - If average difference exceeds $\pm 0.3\text{ hPa}$, enter the calibration offset into the station setup menu:
     $$\text{Offset} = P_{\text{reference}} - P_{\text{station}}$$

### 4.3 Relative Humidity Channel (Capacitive Polymer Hygrometer)
1. **Filter Cap Inspection**:
   - Unscrew sintered Teflon / bronze filter cap. Clean with deionized water if caked with dust.
2. **Saturated Salt Calibration**:
   - Perform dual-point calibration using Lithium Chloride ($11.3\% RH$) and Sodium Chloride ($75.3\% RH$) standard calibration chambers.
   - Allow 30 minutes for thermal stabilization before recording offset.

---

## 5. Work-Order Resolution & Re-Integration Protocol

Once on-site repair or replacement is completed:
1. The field engineer connects via the **MetShield Mobile Companion** (`/mobile`) or sends SMS verification code to `IMD-QMS-GW`.
2. The technician inputs the bench calibration code: `CALIB-OK-[TICKET_ID]`.
3. The MetShield-QMS edge engine monitors 6 consecutive telemetry cycles ($15\text{s}$).
4. If physical consistency and spatial cross-validation confirm nominal status (`FLAG_1_VERIFIED_GOOD`), the work order automatically transitions to `CLOSED_RESOLVED`.
5. The station is seamlessly re-admitted into the primary NWP numerical ingestion pipeline.
