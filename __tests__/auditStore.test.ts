import { describe, it, expect } from 'vitest';
import {
  insertEvent,
  getAuditLogSnapshot,
  getAuditLogRecords,
  subscribeToAuditLog,
  InMemoryRingBuffer,
  type StoredFaultEvent,
} from '../lib/supabaseClient';

/**
 * Guards the useSyncExternalStore contract used by app/incidents/page.tsx.
 *
 * React compares snapshots by IDENTITY. If getSnapshot() allocates a new array
 * on every call, the component re-renders forever. These tests pin both
 * requirements: stable identity between mutations, and a new identity after
 * one.
 */

function makeEvent(id: string): StoredFaultEvent {
  return {
    eventId: id,
    stationId: 'AWS-DEL-04',
    timestamp: '2026-09-27T11:30:00.000Z',
    timeIST: '27-09-2026 17:00:00 IST',
    parameter: 'temperature',
    rawVal: 31.4,
    imputedVal: 0,
    temperatureC: 31.4,
    pres_hPa: 1004.2,
    rh_pct: 62,
    classification: 'FLAG_1_NOMINAL',
    severity: 'INFO',
    xaiAttribution: { tempWeight: 50, pressWeight: 25, humWeight: 25, explanation: 'nominal' },
    recommendedAction: 'No action required.',
  };
}

describe('audit log external store contract', () => {
  it('returns an identity-stable snapshot when nothing has changed', () => {
    const a = getAuditLogSnapshot();
    const b = getAuditLogSnapshot();
    expect(a).toBe(b);
  });

  it('does not alias the internal buffer array', () => {
    // A caller must not be able to mutate the store by writing to the snapshot.
    const snap = getAuditLogSnapshot();
    expect(snap).not.toBe(getAuditLogRecords());
    expect(Array.isArray(snap)).toBe(true);
  });

  it('produces a new identity after a fault event is inserted', async () => {
    const before = getAuditLogSnapshot();
    await insertEvent(makeEvent('EVT-SUBSCRIBER-TEST-1'));
    const after = getAuditLogSnapshot();

    expect(after).not.toBe(before);
    expect(after.length).toBeGreaterThan(0);
    expect(after.some((e) => e.eventId === 'EVT-SUBSCRIBER-TEST-1')).toBe(true);
  });

  it('notifies subscribers when the buffer changes', async () => {
    let calls = 0;
    const unsubscribe = subscribeToAuditLog(() => {
      calls++;
    });

    await insertEvent(makeEvent('EVT-SUBSCRIBER-TEST-2'));
    // Notification is queued on a microtask.
    await new Promise((r) => setTimeout(r, 0));

    expect(calls).toBeGreaterThan(0);
    unsubscribe();
  });

  it('stops notifying after unsubscribe', async () => {
    let calls = 0;
    const unsubscribe = subscribeToAuditLog(() => {
      calls++;
    });
    unsubscribe();

    await insertEvent(makeEvent('EVT-SUBSCRIBER-TEST-3'));
    await new Promise((r) => setTimeout(r, 0));

    expect(calls).toBe(0);
  });

  it('a throwing subscriber does not break other subscribers', async () => {
    let good = 0;
    const unsubBad = subscribeToAuditLog(() => {
      throw new Error('subscriber exploded');
    });
    const unsubGood = subscribeToAuditLog(() => {
      good++;
    });

    await insertEvent(makeEvent('EVT-SUBSCRIBER-TEST-4'));
    await new Promise((r) => setTimeout(r, 0));

    expect(good).toBeGreaterThan(0);
    unsubBad();
    unsubGood();
  });
});

describe('InMemoryRingBuffer', () => {
  it('evicts oldest entries past the cap', () => {
    const buf = new InMemoryRingBuffer<number>(3);
    [1, 2, 3, 4, 5].forEach((n) => buf.add(n));
    expect(buf.getAll()).toEqual([3, 4, 5]);
    expect(buf.length).toBe(3);
  });

  it('getAll returns a copy, not the internal array', () => {
    const buf = new InMemoryRingBuffer<number>(3);
    buf.add(1);
    const first = buf.getAll();
    first.push(999);
    expect(buf.length).toBe(1);
  });

  it('getRecent returns the trailing window', () => {
    const buf = new InMemoryRingBuffer<number>(5);
    [1, 2, 3, 4].forEach((n) => buf.add(n));
    expect(buf.getRecent(2)).toEqual([3, 4]);
  });
});
