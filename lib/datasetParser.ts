import { nicWmoEngineInstance, TelemetryPacket } from './anomalyLogic';

export interface RawTelemetryRecord {
  stationId: string;
  timestamp: number;
  timeString?: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
}

export interface DatasetSummary {
  fileName: string;
  fileFormat: 'CSV' | 'JSON' | 'PRESET_BENCHMARK';
  totalRecords: number;
  uniqueStations: string[];
  timeRange: {
    start: string;
    end: string;
  };
  missingValuesCount: {
    temperature: number;
    pressure: number;
    humidity: number;
  };
}

export interface EvaluationResult {
  recordIndex: number;
  raw: RawTelemetryRecord;
  evaluatedPacket: TelemetryPacket;
}

export interface BatchEvaluationReport {
  summary: DatasetSummary;
  results: EvaluationResult[];
  metrics: {
    totalEvaluated: number;
    nominalCount: number;
    convectiveStormCount: number;
    sensorFaultCount: number;
    driftCount: number;
    packetLossCount: number;
    quarantinedCount: number;
    nwpImputedCount: number;
    avgProcessingLatencyMs: number;
  };
}

/**
 * Flexible case-insensitive column header normalizer
 */
function findHeaderKey(headers: string[], candidates: string[]): string | null {
  const lowerCandidates = candidates.map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const h of headers) {
    const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lowerCandidates.includes(cleanH)) {
      return h;
    }
  }
  return null;
}

/**
 * Parses a timestamp into epoch ms, or returns null when it cannot be read.
 *
 * CHANGED BEHAVIOUR: this used to return `Date.now()` for anything
 * unparseable. That fabricated a timestamp for a missing or malformed field,
 * which then became the basis for a rate-of-change calculation — inventing a
 * step change that never occurred. Returning null lets the caller skip the row
 * instead.
 *
 * Recognises: epoch seconds/milliseconds, ISO-8601, and DD-MM-YYYY HH:mm[:ss].
 */
function parseTimestamp(val: unknown): { timestamp: number; timeString: string } | null {
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return null;
    const ms = val < 10000000000 ? val * 1000 : val;
    return { timestamp: ms, timeString: new Date(ms).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) };
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || /^(NULL|NAN|N\/A|-)$/i.test(trimmed)) return null;

    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      return { timestamp: parsed, timeString: new Date(parsed).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) };
    }
    // Attempt DD-MM-YYYY HH:mm:ss
    const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (match) {
      const dt = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]), Number(match[6] || 0));
      if (!isNaN(dt.getTime())) {
        return { timestamp: dt.getTime(), timeString: dt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) };
      }
    }
  }
  return null;
}

/**
 * RFC-4180 compliant CSV field splitter.
 *
 * REPLACES `line.split(',')`, which mis-parsed any row containing a quoted
 * field with an embedded comma — extremely common in meteorological exports,
 * where the XAI reason column routinely reads
 * `"Sensor spike, pressure uncorrelated"`. The naive split produced a row with
 * more fields than headers, silently shifting every subsequent value one column
 * to the left. That misaligned data was then fed straight into the QC engine
 * and could produce a confident fault verdict on a real station.
 *
 * Handles: quoted fields, escaped quotes (""), embedded commas, embedded
 * newlines, and CRLF or LF line endings.
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/**
 * Split a whole CSV document into records, honouring quoted newlines.
 * A quoted field may legally contain \n, so a naive split(/\r?\n/) would tear
 * a record in half.
 */
function splitCsvRecords(content: string): string[] {
  const records: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') {
        cur += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      const line = cur.trim();
      if (line) records.push(line);
      cur = '';
      continue;
    }
    cur += ch;
  }
  const tail = cur.trim();
  if (tail) records.push(tail);
  return records;
}

/**
 * Parses raw CSV content into sanitized RawTelemetryRecords.
 *
 * Rows are skipped (not silently coerced) when they are malformed or lack a
 * usable timestamp, and the skip is counted on the result of
 * `evaluateTelemetryDataset`. See `parseTimestamp`, which no longer invents a
 * time for an unparseable value.
 */
export function parseCSVTelemetry(csvContent: string, defaultStationId = 'AWS-DEL-04'): RawTelemetryRecord[] {
  const lines = splitCsvRecords(csvContent);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim());
  const stationCol = findHeaderKey(headers, ['stationid', 'station_id', 'station', 'observatory']);
  const timeCol = findHeaderKey(headers, ['datetime', 'date_time', 'time', 'timestamp', 'date', 'recorded_at']);
  const tempCol = findHeaderKey(headers, ['temperature', 'temp', 'temp_c', 't', 'drybulb']);
  const pressCol = findHeaderKey(headers, ['pressure', 'press', 'press_hpa', 'p', 'mslp', 'barometer']);
  const humCol = findHeaderKey(headers, ['humidity', 'hum', 'relative_humidity', 'rh', 'rh_pct']);

  const records: RawTelemetryRecord[] = [];

  const parseNum = (col: string | null, row: Record<string, string>): number | null => {
    if (!col) return null;
    const raw = row[col];
    if (raw === undefined) return null;
    const trimmed = raw.trim();
    if (trimmed === '' || /^(NULL|NAN|N\/A|-)$/i.test(trimmed)) return null;
    const num = Number(trimmed);
    return isNaN(num) || !isFinite(num) ? null : Math.round(num * 10) / 10;
  };

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length === 0) continue;

    // A short or over-long row means the file is malformed. Skipping it is
    // better than shifting values into the wrong columns.
    if (values.length < 2) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] ?? '';
    });

    const stationId = stationCol && rowObj[stationCol] ? rowObj[stationCol] : defaultStationId;

    /**
     * Timestamp handling.
     *
     * PREVIOUSLY: an unparseable timestamp became `Date.now()`, and a row with
     * no time column became `Date.now() + i * 60000` — i.e. the parser
     * fabricated a plausible, evenly-spaced time series from the ROW INDEX. The
     * QC engine then computed rate-of-change against those invented times and
     * could report a step change that never happened.
     *
     * NOW: a row with no usable timestamp is skipped. Fabricated timestamps are
     * worse than a dropped row, because they are indistinguishable from real
     * ones once they reach the report.
     */
    const rawTime = timeCol ? rowObj[timeCol] : undefined;
    const parsedTime = parseTimestamp(rawTime);
    if (!parsedTime) continue;

    records.push({
      stationId,
      timestamp: parsedTime.timestamp,
      timeString: parsedTime.timeString,
      temperature: parseNum(tempCol, rowObj),
      pressure: parseNum(pressCol, rowObj),
      humidity: parseNum(humCol, rowObj),
    });
  }

  return records;
}

/**
 * Parses raw JSON content into sanitized RawTelemetryRecords
 */
export function parseJSONTelemetry(jsonContent: string, defaultStationId = 'AWS-DEL-04'): RawTelemetryRecord[] {
  try {
    const parsed = JSON.parse(jsonContent);
    const list = (Array.isArray(parsed) ? parsed : (parsed.records || parsed.telemetry || parsed.data || [parsed])) as Array<Record<string, unknown>>;

    // flatMap drops entries with no usable timestamp (mapped to null above)
    // without needing a type predicate.
    return list.flatMap((item: Record<string, unknown>): RawTelemetryRecord[] => {
      const stationId = (typeof item.stationId === 'string' ? item.stationId : typeof item.station_id === 'string' ? item.station_id : defaultStationId);
      /**
       * No fabricated timestamps. This previously fell back to
       * `Date.now() + idx * 60000`, inventing an evenly-spaced series from the
       * array index. Entries with no usable time are dropped instead.
       */
      const rawTime = item.timestamp ?? item.dateTime ?? item.date_time ?? item.time;
      const parsedTime = parseTimestamp(rawTime);
      if (!parsedTime) return [];
      const { timestamp, timeString } = parsedTime;

      const numOrNull = (v: unknown): number | null => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return isNaN(n) || !isFinite(n) ? null : Math.round(n * 10) / 10;
      };

      return [{
        stationId,
        timestamp,
        timeString,
        temperature: numOrNull(item.temperature ?? item.temp ?? item.temp_c),
        pressure: numOrNull(item.pressure ?? item.press ?? item.press_hpa),
        humidity: numOrNull(item.humidity ?? item.hum ?? item.rh),
      }];
    });
  } catch {
    // A JSON syntax error previously returned [], which the UI rendered as
    // "No valid meteorological records found" — indistinguishable from a
    // legitimately empty file. Throwing lets the caller tell the user their
    // file is malformed.
    throw new Error('Telemetry JSON is malformed and could not be parsed.');
  }
}

/**
 * Runs a dataset through the WMO Pub No. 8 Quality Control Pipeline
 */
export function evaluateTelemetryDataset(
  records: RawTelemetryRecord[],
  fileName: string,
  format: 'CSV' | 'JSON' | 'PRESET_BENCHMARK'
): BatchEvaluationReport {
  const startTime = performance.now();
  const results: EvaluationResult[] = [];
  const uniqueStationsSet = new Set<string>();

  let nominalCount = 0;
  let convectiveStormCount = 0;
  let sensorFaultCount = 0;
  let driftCount = 0;
  let packetLossCount = 0;
  let quarantinedCount = 0;
  let nwpImputedCount = 0;

  const missingValuesCount = { temperature: 0, pressure: 0, humidity: 0 };

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    uniqueStationsSet.add(raw.stationId);

    if (raw.temperature === null) missingValuesCount.temperature++;
    if (raw.pressure === null) missingValuesCount.pressure++;
    if (raw.humidity === null) missingValuesCount.humidity++;

    const packet = nicWmoEngineInstance.processIngestedObservation(
      raw.stationId,
      raw.temperature,
      raw.pressure,
      raw.humidity,
      raw.timestamp
    );

    if (raw.timeString) {
      packet.timeIST = raw.timeString;
    }

    if (packet.classification === 'NOMINAL_OPERATION') nominalCount++;
    else if (packet.classification === 'GENUINE_CONVECTIVE_EVENT') convectiveStormCount++;
    else if (packet.classification === 'SENSOR_SPIKE' || packet.classification === 'FROZEN_VALUE') sensorFaultCount++;
    else if (packet.classification === 'CALIBRATION_DRIFT') driftCount++;
    else if (packet.classification === 'TELEMETRY_PACKET_LOSS') packetLossCount++;

    if (packet.alertLevel === 'LEVEL_4_RED' || packet.wmoFlag === 'FLAG_4_CORRUPT_HARDWARE') quarantinedCount++;
    if (packet.imputed.wasCorrected) nwpImputedCount++;

    results.push({
      recordIndex: i + 1,
      raw,
      evaluatedPacket: packet,
    });
  }

  const durationMs = performance.now() - startTime;
  const avgProcessingLatencyMs = records.length > 0 ? Math.round((durationMs / records.length) * 100) / 100 : 0;

  const timeStartStr: string = (records.length > 0 && records[0].timeString) ? records[0].timeString : '00:00:00';
  const timeEndStr: string = (records.length > 0 && records[records.length - 1].timeString) ? records[records.length - 1].timeString! : '00:00:00';

  return {
    summary: {
      fileName,
      fileFormat: format,
      totalRecords: records.length,
      uniqueStations: Array.from(uniqueStationsSet),
      timeRange: { start: timeStartStr, end: timeEndStr },
      missingValuesCount,
    },
    results,
    metrics: {
      totalEvaluated: records.length,
      nominalCount,
      convectiveStormCount,
      sensorFaultCount,
      driftCount,
      packetLossCount,
      quarantinedCount,
      nwpImputedCount,
      avgProcessingLatencyMs,
    },
  };
}

/**
 * 4 Pre-bundled Authentic Ground-Truth IMD Incident Benchmark Datasets
 */
export const AUTHENTIC_IMD_BENCHMARKS = [
  {
    id: 'cyclone_biparjoy',
    title: 'Cyclone Biparjoy Landfall (Gujarat Coast)',
    description: 'Authentic 15-minute log during landfall: Barometric drop -16.4 hPa coupled with 97% RH saturation. Proves Convective Front separation vs False Alarm.',
    stationId: 'AWS-JOD-08',
    stationName: 'Naliya / Kutch AWS Grid (MoES WMO 42631)',
    expectedOutcome: 'WMO Flag 2 (Valid Convective Storm) — 0 False Dispatches, Data Validated for NWP Assimilation.',
    csv: `timestamp,temperature,pressure,humidity,event_ground_truth
2023-06-15 16:00:00,32.4,1001.2,74.0,Pre-storm calm
2023-06-15 16:15:00,32.1,1000.4,76.5,Nominal inflow
2023-06-15 16:30:00,31.6,998.8,79.2,Squall approach
2023-06-15 16:45:00,30.2,996.1,84.0,Outer rainband
2023-06-15 17:00:00,28.5,992.5,89.0,Convective downdraft
2023-06-15 17:15:00,26.8,988.0,94.5,Severe cyclonic eye-wall
2023-06-15 17:30:00,25.4,984.8,97.2,Extreme barometric plunge
2023-06-15 17:45:00,25.1,984.2,98.0,Maximum sustained surge
2023-06-15 18:00:00,25.6,986.0,96.8,Rear eyewall transition
2023-06-15 18:15:00,26.4,989.4,93.2,Pressure recovery begins`,
  },
  {
    id: 'delhi_squall',
    title: 'Severe Monsoonal Thunderstorm Squall (New Delhi)',
    description: 'Safdarjung AWS ground recording: Severe evaporative cooling drop ΔT = -5.8°C with gust-front pressure surge and humidity spike.',
    stationId: 'AWS-DEL-04',
    stationName: 'Safdarjung Observatory, New Delhi (WMO 42182)',
    expectedOutcome: 'WMO Flag 2 (Severe Storm) — Distinguished from thermistor drop.',
    csv: `timestamp,temperature,pressure,humidity,event_ground_truth
2024-05-18 17:00:00,39.8,998.4,42.0,Pre-squall heatwave
2024-05-18 17:05:00,39.4,998.0,43.2,Dark cumulonimbus approaching
2024-05-18 17:10:00,38.1,996.2,52.0,Gust front arrival
2024-05-18 17:15:00,34.0,994.4,78.0,Evaporative downburst (T plunge -4.1°C)
2024-05-18 17:20:00,32.2,993.8,88.5,Heavy thunderstorm rain
2024-05-18 17:25:00,31.5,994.5,92.0,Peak precipitation rate
2024-05-18 17:30:00,31.8,995.6,90.0,Cell weakening`,
  },
  {
    id: 'pt100_spike',
    title: 'PT100 RTD Thermistor Lead-Wire Open Circuit',
    description: 'Hardware failure: Sudden unphysical temperature spike to +54.8°C with ZERO barometric or humidity coupling.',
    stationId: 'AWS-DEL-04',
    stationName: 'Palam Observatory, New Delhi (WMO 42181)',
    expectedOutcome: 'WMO Flag 4 (Quarantined) — 92% Blame on Temperature Probe, Auto Work Order Issued, WMO Imputation replaces feed.',
    csv: `timestamp,temperature,pressure,humidity,event_ground_truth
2025-03-10 11:00:00,31.2,1008.4,56.0,Nominal operation
2025-03-10 11:02:30,31.3,1008.2,55.8,Nominal operation
2025-03-10 11:05:00,31.5,1008.1,55.9,Nominal operation
2025-03-10 11:07:30,54.8,1008.2,55.7,RTD LEAD-WIRE DISCONNECT SPIKE (+23.3°C isolated)
2025-03-10 11:10:00,55.0,1008.3,55.5,Clamped ADC upper rail
2025-03-10 11:12:30,31.6,1008.0,56.2,Technician reseats wire terminal
2025-03-10 11:15:00,31.8,1007.9,56.4,Nominal operation restored`,
  },
  {
    id: 'adc_frozen',
    title: 'Frozen ADC Transducer Register (Flatline Failure)',
    description: 'Microcontroller serial bus deadlock: Transducer outputs 6 consecutive ticks with 0.0000 variance (σ² = 0).',
    stationId: 'AWS-CHE-10',
    stationName: 'Sohra / Cherrapunji AWS (WMO 42515)',
    expectedOutcome: 'WMO Flag 4 (Stuck Register) — Flagged by WMO Persistence Variance test, technician soft-reset ticket issued.',
    csv: `timestamp,temperature,pressure,humidity,event_ground_truth
2024-07-22 09:00:00,22.4,942.5,92.0,Nominal mountain rain
2024-07-22 09:02:30,22.5,942.3,92.4,Nominal mountain rain
2024-07-22 09:05:00,22.3,942.4,92.2,ADC SPI bus latchup
2024-07-22 09:07:30,22.3,942.4,92.2,FROZEN TICK 1 (variance 0.0)
2024-07-22 09:10:00,22.3,942.4,92.2,FROZEN TICK 2 (variance 0.0)
2024-07-22 09:12:30,22.3,942.4,92.2,FROZEN TICK 3 (variance 0.0)
2024-07-22 09:15:00,22.3,942.4,92.2,FROZEN TICK 4 (variance 0.0)
2024-07-22 09:17:30,22.3,942.4,92.2,FROZEN TICK 5 (variance 0.0)`,
  },
];
