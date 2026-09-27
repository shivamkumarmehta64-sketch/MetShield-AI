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
  /**
   * Value of `parameter` at the time of the event (the primary/most-relevant
   * channel for the classification).
   */
  rawVal: number;
  imputedVal: number;
  /**
   * Full 3-parameter snapshot.
   *
   * These were MISSING before, which is the root cause of the corrupt audit
   * export: `generateAuditCsvContent` declared 8 columns — including
   * `Pres_hPa` and `RH_pct` — but had no pressure or humidity to write, so it
   * emitted `rawVal` twice (duplicating temperature into the pressure column)
   * and a literal `0` for humidity. The compliance artifact was fabricating
   * two of its five measurement columns.
   */
  temperatureC?: number;
  pres_hPa?: number;
  rh_pct?: number;
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

/**
 * Notify fault-event subscribers that the buffer changed.
 *
 * Without this, a page that reads the buffer once on mount shows a snapshot
 * that silently goes stale — the incident log never reflected new faults
 * without a manual reload. The update is queued to a microtask so several
 * inserts in the same tick produce one notification rather than a render per
 * event.
 */
function notifyEventSubscribers() {
  invalidateAuditSnapshot();
  if (eventSubscribers.size === 0) return;
  queueMicrotask(() => {
    for (const cb of [...eventSubscribers]) {
      try {
        cb();
      } catch (err) {
        console.error('[Supabase] Fault-event subscriber threw:', err);
      }
    }
  });
}

export async function insertEvent(event: StoredFaultEvent) {
  if (hasSupabase && supabase) {
    try {
      const { error } = await supabase.from('fault_events').insert([event]);
      if (error) {
        console.warn('[Supabase Fallback] Event insert failed, buffering locally:', error.message);
        eventBuffer.add(event);
        notifyEventSubscribers();
      }
    } catch {
      eventBuffer.add(event);
      notifyEventSubscribers();
    }
  } else {
    eventBuffer.add(event);
    notifyEventSubscribers();
  }
}

export function getAuditLogRecords(): StoredFaultEvent[] {
  return eventBuffer.getAll();
}

/**
 * Identity-stable snapshot for useSyncExternalStore.
 *
 * `getAll()` allocates a fresh array on every call, but useSyncExternalStore
 * compares snapshots by IDENTITY and re-renders whenever the reference changes.
 * Returning a new array each time therefore causes an infinite render loop.
 *
 * The cache is invalidated explicitly by invalidateAuditSnapshot() on every
 * mutation, so identity only changes when the contents actually changed.
 */
let auditSnapshot: StoredFaultEvent[] = eventBuffer.getAll();

function invalidateAuditSnapshot(): void {
  auditSnapshot = eventBuffer.getAll();
}

export function getAuditLogSnapshot(): StoredFaultEvent[] {
  return auditSnapshot;
}

const eventSubscribers = new Set<() => void>();

/**
 * Subscribe to fault-event buffer changes.
 *
 * Returns an unsubscribe function. Intended for a `useSyncExternalStore`
 * `subscribe` callback.
 */
export function subscribeToAuditLog(onChange: () => void): () => void {
  eventSubscribers.add(onChange);
  return () => {
    eventSubscribers.delete(onChange);
  };
}

/**
 * Neutralizes CSV Formula Injection (CWE-1236) for spreadsheet viewers.
 *
 * Applied to EVERY field, including the numeric ones. Previously only the
 * string columns went through this guard, so a hostile string arriving via a
 * numeric field (e.g. a corrupted `rawVal` of `"+cmd|..."`) was exported
 * verbatim and would be executed by Excel or Sheets on open.
 *
 * Real numbers are returned unquoted so the export stays machine-readable;
 * anything non-numeric is quoted and escaped.
 */
function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'number') {
    return Number.isFinite(val) ? String(val) : '""';
  }
  const str = String(val);
  // Neutralize spreadsheet formula execution prefixes (=, +, -, @, \t, \r)
  const isFormula = /^[=+\-@\t\r]/.test(str);
  const safeStr = isFormula ? `'${str}` : str;
  return `"${safeStr.replace(/"/g, '""')}"`;
}

/** Exported for direct unit testing of the injection guard. */
export const sanitizeCsvCellForTest = sanitizeCsvCell;

/**
 * Generate the NIC/MoES audit CSV.
 *
 * Every measurement column now carries the real observed value. Where a value
 * is genuinely absent the cell is left empty (`""`) rather than filled with a
 * placeholder, so a reviewer can distinguish "not measured" from "measured as
 * zero". An empty cell in an audit export is honest; a fabricated one is not.
 */
export function generateAuditCsvContent(events: StoredFaultEvent[]): string {
  const header = [
    '# METSHIELD AI NAWS-QMS v4.2 | TEAM 73869 AEROTECH',
    '# AUTOMATIC WEATHER STATION QUALITY MANAGEMENT SYSTEM',
    `# AUDIT LOG GENERATED AT: ${new Date().toISOString()} (IST)`,
    '# STANDARDS: WMO-No. 8 OPEN METEOROLOGICAL PROTOCOL',
    '# NOTE: Pressure is mean-sea-level (QNH) reduced via the standard atmosphere.',
    '# Empty measurement cells mean the channel was not reporting, not zero.',
    '# =========================================================================',
    'Station_ID,Timestamp_IST,Temp_C,Pres_hPa,RH_pct,WMO_QC_Flag,XAI_Reasoning,Imputed_Value'
  ].join('\n');

  const rows = events.map((e) => {
    // Prefer the explicit 3-parameter snapshot; fall back to `rawVal` only when
    // the event is for the temperature channel, where rawVal IS the temperature.
    const temp = e.temperatureC ?? (e.parameter === 'temperature' ? e.rawVal : undefined);
    const pres = e.pres_hPa;
    const rh = e.rh_pct;
    return [
      sanitizeCsvCell(e.stationId),
      sanitizeCsvCell(e.timeIST),
      sanitizeCsvCell(temp),
      sanitizeCsvCell(pres),
      sanitizeCsvCell(rh),
      sanitizeCsvCell(e.classification),
      sanitizeCsvCell(e.xaiAttribution?.explanation || ''),
      sanitizeCsvCell(Number.isFinite(e.imputedVal) ? e.imputedVal : undefined)
    ].join(',');
  });

  return `${header}\n${rows.join('\n')}`;
}
