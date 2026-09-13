import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

/**
 * High-performance sliding ring-buffer to maintain bounded in-memory persistence
 * Prevents browser memory leaks during extended pitches or prolonged monitoring sessions.
 */
export class InMemoryRingBuffer<T> {
  private buffer: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 30) {
    this.maxSize = maxSize;
  }

  add(item: T) {
    // Keep only the last `maxSize` elements via sliding window slice
    this.buffer = [...this.buffer, item].slice(-this.maxSize);
  }

  getAll(): T[] {
    return [...this.buffer];
  }

  getRecent(count: number): T[] {
    return this.buffer.slice(-count);
  }

  clear() {
    this.buffer = [];
  }

  get length(): number {
    return this.buffer.length;
  }
}

export interface StoredTelemetryPacket {
  packetId: string;
  stationId: string;
  timestamp: number;
  timeIST: string;
  temperature: number;
  pressure: number;
  humidity: number;
  windSpeedKph?: number;
  classification: string;
  alertLevel: string;
  wmoFlag?: string;
  imputedVal?: {
    temperature?: number;
    pressure?: number;
    humidity?: number;
  };
}

export interface StoredFaultEvent {
  eventId: string;
  stationId: string;
  timestamp: string;
  timeIST: string;
  parameter: string;
  rawVal: number;
  imputedVal: number;
  classification: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'GENUINE_WEATHER';
  xaiAttribution: {
    tempWeight: number;
    pressWeight: number;
    humWeight: number;
    explanation: string;
  };
  recommendedAction: string;
}

// Global persistence buffers
export const telemetryBuffer = new InMemoryRingBuffer<StoredTelemetryPacket>(50);
export const eventBuffer = new InMemoryRingBuffer<StoredFaultEvent>(100);

export async function insertTelemetry(data: StoredTelemetryPacket) {
  if (hasSupabase && supabase) {
    try {
      const { error } = await supabase.from('telemetry').insert([data]);
      if (error) {
        console.warn('[Supabase Fallback] Telemetry insert failed, buffering locally:', error.message);
        telemetryBuffer.add(data);
      }
    } catch {
      telemetryBuffer.add(data);
    }
  } else {
    telemetryBuffer.add(data);
  }
}

export async function insertEvent(event: StoredFaultEvent) {
  if (hasSupabase && supabase) {
    try {
      const { error } = await supabase.from('fault_events').insert([event]);
      if (error) {
        console.warn('[Supabase Fallback] Event insert failed, buffering locally:', error.message);
        eventBuffer.add(event);
      }
    } catch {
      eventBuffer.add(event);
    }
  } else {
    eventBuffer.add(event);
  }
}

export function getAuditLogRecords(): StoredFaultEvent[] {
  return eventBuffer.getAll();
}

/**
 * Neutralizes CSV Formula Injection (CWE-1236) for spreadsheet viewers
 */
function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // Neutralize spreadsheet formula execution prefixes (=, +, -, @, \t, \r)
  const isFormula = /^[=+\-@\t\r]/.test(str);
  const safeStr = isFormula ? `'${str}` : str;
  return `"${safeStr.replace(/"/g, '""')}"`;
}

/**
 * Generate official NIC-MoES compliant CSV string for audit reporting
 */
export function generateAuditCsvContent(events: StoredFaultEvent[]): string {
  const header = [
    '# METSHIELD AI NAWS-QMS v4.2 | TEAM 73869 AEROTECH',
    '# AUTOMATIC WEATHER STATION QUALITY MANAGEMENT SYSTEM',
    `# AUDIT LOG GENERATED AT: ${new Date().toISOString()} (IST)`,
    '# STANDARDS COMPLIANCE: WMO-No. 8 OPEN METEOROLOGICAL PROTOCOL',
    '# =========================================================================',
    'Event_ID,Station_ID,Timestamp_IST,Parameter,Raw_Value,Imputed_Value,Classification,Severity,Temp_Attribution_Pct,Press_Attribution_Pct,Hum_Attribution_Pct,Recommended_Action'
  ].join('\n');

  const rows = events.map(e => {
    return [
      sanitizeCsvCell(e.eventId),
      sanitizeCsvCell(e.stationId),
      sanitizeCsvCell(e.timeIST),
      sanitizeCsvCell(e.parameter),
      Number(e.rawVal) || 0,
      Number(e.imputedVal) || 0,
      sanitizeCsvCell(e.classification),
      sanitizeCsvCell(e.severity),
      Number(e.xaiAttribution?.tempWeight) || 0,
      Number(e.xaiAttribution?.pressWeight) || 0,
      Number(e.xaiAttribution?.humWeight) || 0,
      sanitizeCsvCell(e.recommendedAction)
    ].join(',');
  });

  return `${header}\n${rows.join('\n')}`;
}
