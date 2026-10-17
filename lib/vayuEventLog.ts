/**
 * vayuEventLog.ts
 * Manages chronological station health events, fault transitions, and CSV exports.
 */

import { SeverityLevel } from './sensorFaultEngine';

export interface VayuEventLogEntry {
  id: string;
  timestamp: string; // ISO string
  timeFormatted: string; // e.g., "14:32 IST"
  districtId: string;
  districtName: string;
  state: string;
  faultCode: string;
  severity: SeverityLevel | 'RESOLVED';
  message: string;
  value?: unknown;
}

const eventLog: VayuEventLogEntry[] = [];
const eventListeners = new Set<() => void>();

function formatISTTime(date: Date): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const h = String(ist.getHours()).padStart(2, '0');
  const m = String(ist.getMinutes()).padStart(2, '0');
  return `${h}:${m} IST`;
}

export function logVayuEvent(entry: Omit<VayuEventLogEntry, 'id' | 'timestamp' | 'timeFormatted'>) {
  const now = new Date();
  const item: VayuEventLogEntry = {
    ...entry,
    id: 'EVT-' + crypto.randomUUID(),
    timestamp: now.toISOString(),
    timeFormatted: formatISTTime(now)
  };

  eventLog.unshift(item); // newest first
  if (eventLog.length > 500) {
    eventLog.pop(); // keep last 500
  }

  for (const fn of eventListeners) {
    try {
      fn();
    } catch (e) {
      console.error('Event listener error:', e);
    }
  }
}

export function getVayuEvents(filterDistrictId?: string, filterSeverity?: string): VayuEventLogEntry[] {
  let list = eventLog;
  if (filterDistrictId) {
    list = list.filter(e => e.districtId === filterDistrictId);
  }
  if (filterSeverity && filterSeverity !== 'ALL') {
    list = list.filter(e => e.severity === filterSeverity);
  }
  return list;
}

export function subscribeToVayuEvents(fn: () => void): () => void {
  eventListeners.add(fn);
  return () => {
    eventListeners.delete(fn);
  };
}

export function exportEventLogToCSV(districtId?: string): string {
  const list = districtId ? eventLog.filter(e => e.districtId === districtId) : eventLog;
  const headers = ['Time', 'District', 'State', 'Severity', 'Fault Code', 'Message'];
  const rows = list.map(e => [
    `"${e.timeFormatted}"`,
    `"${e.districtName}"`,
    `"${e.state}"`,
    `"${e.severity}"`,
    `"${e.faultCode}"`,
    `"${e.message.replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
