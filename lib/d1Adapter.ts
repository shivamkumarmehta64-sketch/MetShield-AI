/**
 * MetShield AI: Meteorological Edge Telemetry Shield
 * Cloudflare D1 Serverless SQLite Edge Adapter (100% Zero-Cost Persistence)
 *
 * Provides resilient, low-latency (<5ms) persistent storage across Cloudflare's
 * 330+ Anycast edge locations using free-tier Cloudflare D1 database (binding: DB).
 * Transparently falls back to in-memory storage on Vercel and local development.
 */

import { TelemetryPacket, WorkOrderTicket } from './anomalyLogic';

export interface D1Database {
  prepare(query: string): {
    bind(...values: unknown[]): {
      run(): Promise<{ success: boolean; meta?: unknown }>;
      all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
      first<T = unknown>(): Promise<T | null>;
    };
  };
  exec(query: string): Promise<{ count: number; duration: number }>;
}

// In-memory fallback ring buffer for Vercel / Node local runtimes
const fallbackTelemetryLog: TelemetryPacket[] = [];
const fallbackWorkOrders = new Map<string, WorkOrderTicket>();

/**
 * Resolves the Cloudflare D1 binding from runtime context if available
 */
export function resolveD1Binding(): D1Database | null {
  if (typeof globalThis !== 'undefined') {
    // 1. Check direct global binding (Cloudflare Workers native)
    const g = globalThis as unknown as { DB?: D1Database; __env__?: { DB?: D1Database } };
    if (g.DB && typeof g.DB.prepare === 'function') return g.DB;
    if (g.__env__?.DB && typeof g.__env__.DB.prepare === 'function') return g.__env__.DB;
  }
  return null;
}

/**
 * Initializes the SQLite tables on Cloudflare D1 if not already present
 */
export async function initializeD1Schema(db?: D1Database | null): Promise<boolean> {
  const targetDb = db || resolveD1Binding();
  if (!targetDb) return false;

  try {
    await targetDb.exec(`
      CREATE TABLE IF NOT EXISTS telemetry_audit (
        packet_id TEXT PRIMARY KEY,
        station_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        wmo_flag TEXT NOT NULL,
        classification TEXT NOT NULL,
        alert_level TEXT NOT NULL,
        temp_raw REAL,
        press_raw REAL,
        hum_raw REAL,
        qnh_press REAL,
        imputed_temp REAL,
        imputed_press REAL,
        imputed_hum REAL,
        hmac_seal TEXT NOT NULL,
        tamper_status TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_telemetry_station ON telemetry_audit(station_id, timestamp DESC);

      CREATE TABLE IF NOT EXISTS field_work_orders (
        ticket_id TEXT PRIMARY KEY,
        station_id TEXT NOT NULL,
        station_name TEXT NOT NULL,
        classification TEXT NOT NULL,
        alert_level TEXT NOT NULL,
        status TEXT NOT NULL,
        diagnostic_note TEXT,
        created_at INTEGER NOT NULL,
        resolved_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_work_orders_status ON field_work_orders(status);
    `);
    return true;
  } catch (err) {
    console.warn('[D1 Adapter] Schema initialization warning (safe to ignore if already initialized):', err);
    return false;
  }
}

/**
 * Persists a validated telemetry packet to Cloudflare D1 with fallback to RAM
 */
export async function persistTelemetryToEdge(
  packet: TelemetryPacket,
  db?: D1Database | null
): Promise<{ persisted: boolean; storage: 'D1_EDGE_SQLITE' | 'IN_MEMORY_FALLBACK' }> {
  const targetDb = db || resolveD1Binding();

  // Always keep in-memory fallback up to date
  fallbackTelemetryLog.unshift(packet);
  if (fallbackTelemetryLog.length > 200) fallbackTelemetryLog.pop();

  if (targetDb) {
    try {
      await targetDb
        .prepare(`
          INSERT OR REPLACE INTO telemetry_audit (
            packet_id, station_id, timestamp, wmo_flag, classification, alert_level,
            temp_raw, press_raw, hum_raw, qnh_press, imputed_temp, imputed_press, imputed_hum,
            hmac_seal, tamper_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          packet.packetId,
          packet.stationId,
          packet.timestamp,
          packet.wmoFlag,
          packet.classification,
          packet.alertLevel,
          packet.raw.temperature,
          packet.raw.pressure,
          packet.raw.humidity,
          (packet as unknown as { orographicQnhPressure?: number }).orographicQnhPressure ?? null,
          packet.imputed.temperature,
          packet.imputed.pressure,
          packet.imputed.humidity,
          packet.securitySeal.hmacSha256,
          packet.securitySeal.tamperStatus
        )
        .run();
      return { persisted: true, storage: 'D1_EDGE_SQLITE' };
    } catch (err) {
      console.error('[D1 Adapter] Failed to persist packet to D1:', err);
    }
  }

  return { persisted: true, storage: 'IN_MEMORY_FALLBACK' };
}

/**
 * Persists or updates a Field Maintenance Work Order
 */
export async function persistWorkOrderToEdge(
  order: WorkOrderTicket,
  db?: D1Database | null
): Promise<{ persisted: boolean; storage: 'D1_EDGE_SQLITE' | 'IN_MEMORY_FALLBACK' }> {
  const targetDb = db || resolveD1Binding();

  fallbackWorkOrders.set(order.ticketId, order);

  if (targetDb) {
    try {
      await targetDb
        .prepare(`
          INSERT OR REPLACE INTO field_work_orders (
            ticket_id, station_id, station_name, classification, alert_level, status, diagnostic_note, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          order.ticketId,
          order.stationId,
          order.stationName,
          order.classification,
          order.alertLevel,
          order.status,
          order.operationalAction,
          Date.now()
        )
        .run();
      return { persisted: true, storage: 'D1_EDGE_SQLITE' };
    } catch (err) {
      console.error('[D1 Adapter] Failed to persist work order to D1:', err);
    }
  }

  return { persisted: true, storage: 'IN_MEMORY_FALLBACK' };
}

/**
 * Resolves or closes a Work Order after field technician calibration
 */
export async function resolveWorkOrderOnEdge(
  ticketId: string,
  technicianNotes: string,
  db?: D1Database | null
): Promise<boolean> {
  const targetDb = db || resolveD1Binding();

  // Update in-memory fallback
  const existing = fallbackWorkOrders.get(ticketId);
  if (existing) {
    existing.status = 'VALIDATED_NWP';
    existing.operationalAction = `Resolved by Technician: ${technicianNotes}`;
  }

  if (targetDb) {
    try {
      await targetDb
        .prepare(`
          UPDATE field_work_orders
          SET status = 'RESOLVED',
              diagnostic_note = diagnostic_note || ' | ' || ?,
              resolved_at = ?
          WHERE ticket_id = ?
        `)
        .bind(technicianNotes, Date.now(), ticketId)
        .run();
      return true;
    } catch (err) {
      console.error('[D1 Adapter] Error resolving work order in D1:', err);
    }
  }

  return existing !== undefined;
}
