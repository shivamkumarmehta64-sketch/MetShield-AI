# Backend Schema & API Definitions (MetShield AI)

## 1. Database Schema Overview
MetShield AI utilizes a hybrid edge-database model. While designed for NIC MeghRaj Sovereign Cloud (PostgreSQL / PostGIS), regional edge instances rely on Cloudflare D1 or Supabase for rapid R/W capabilities.

### 1.1 `aws_telemetry`
Stores raw and imputed weather observations.
- `id` (UUID, Primary Key)
- `station_id` (String, Index) - Must match regex `^AWS-[A-Z]{3}-[0-9]{2}$`.
- `timestamp` (Timestamptz, Index)
- `temp_c` (Float) - Temperature in °C.
- `pressure_hpa` (Float) - Barometric pressure.
- `humidity_pct` (Float) - Relative humidity %.
- `wind_speed_kph` (Float), `wind_dir_deg` (Float)
- `wmo_flag` (Int) - 1: Good, 2: Storm, 3: Suspect/Drift, 4: Hardware Fault, 5: Missing.
- `classification` (String) - Mapped to diagnostic cause (e.g., `SENSOR_SPIKE`, `NOMINAL_OPERATION`).
- `is_imputed` (Boolean) - Whether the data was artificially synthesized via WMA/KNN.
- `integrity_digest` (String) - Deterministic tamper-evident checksum generated at edge.

### 1.2 `maintenance_work_orders`
Tracks Automated NABL dispatch tickets.
- `ticket_id` (UUID, Primary Key)
- `station_id` (String, Foreign Key)
- `fault_type` (String) - e.g., `THERMISTOR_WIRE_BREAK`, `BAROMETER_DRIFT`.
- `dispatch_time` (Timestamptz)
- `status` (Enum: `PENDING`, `DISPATCHED`, `RESOLVED`)
- `resolved_time` (Timestamptz, Nullable)

### 1.3 `stations_registry`
Static catalog of 1,350+ network locations.
- `station_id` (String, Primary Key)
- `latitude` (Float), `longitude` (Float)
- `elevation_m` (Float)
- `district` (String), `state` (String)
- `wmo_block_number` (Int)

## 2. Platform API Routes (Next.js App Router)

### 2.1 `POST /api/telemetry`
**Purpose:** Restful reception of field AWS logs (including `/mobile` smartphone devices).
- **Body Payload (JSON):**
  ```json
  {
    "stationId": "AWS-MOB-01",
    "timestamp": "2026-09-27T10:00:00Z",
    "metrics": {
      "temp": 32.4,
      "pressure": 1002.5,
      "humidity": 68
    }
  }
  ```
- **Response:**
  Returns standard processing audit, including `wmoFlag` and quarantine actions.

### 2.2 `GET /api/stations/:id/history`
**Purpose:** Fetches the last N telemetry records for time-series charts (Thermogram/Barogram).
- **Query Params:** `?limit=100&timeWindow=24h`
- **Output:** Array of `aws_telemetry` rows.

### 2.3 `POST /api/work-orders`
**Purpose:** Webhook target for edge functions upon detecting `FLAG_4_CORRUPT_HARDWARE`.
- Automatically logs a maintenance ticket.

## 3. Data Integrity & Provenance (`lib/dataProvenance.ts`)
Each record is injected into the database only **after** securing a deterministic checksum hash mapping the metrics and timestamp. Any future modification to PostgreSQL rows breaks this digest, guaranteeing NABL audit traceability and preventing data-tampering attacks on the national observation ledger.
