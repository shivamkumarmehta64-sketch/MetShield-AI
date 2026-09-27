/**
 * vayuPoller.ts
 * AGENT 6 — BACKGROUND POLLER + HEALTH ORCHESTRATOR
 *
 * Runs a silent 30-second background loop with adaptive refresh rates and
 * triggers browser notifications on critical sensor anomalies.
 *
 * The adaptive behaviour is driven by REAL district health read from
 * districtEngine.getDistrictHealth(). It previously read two local Maps
 * (previousDistrictHealth / offlineRetryCounts) that nothing ever wrote, so
 * `lastHealth` was permanently 'LOADING' and `retries` permanently 0 — meaning
 * the CRITICAL/DEGRADED priority boost and the "stop after 3 retries" cutoff
 * never actually did anything, while appearing to.
 */

import {
  enqueueDistrictFetch,
  initializeDistrictEngine,
  getDistrictHealth,
} from './districtEngine';
import { ALL_766_DISTRICTS } from './india766Districts';
import { logVayuEvent } from './vayuEventLog';

interface PollerState {
  running: boolean;
  lastCycleTimestamp: number | null;
  totalCyclesCompleted: number;
  activeQueueLength: number;
  notificationPermission: NotificationPermission | 'unsupported';
}

const pollerState: PollerState = {
  running: false,
  lastCycleTimestamp: null,
  totalCyclesCompleted: 0,
  activeQueueLength: 0,
  notificationPermission: 'default'
};

let pollerIntervalId: NodeJS.Timeout | null = null;

/**
 * Consecutive cycles in which a district has been OFFLINE.
 *
 * Reset as soon as the district reports anything other than OFFLINE, so a node
 * that recovers is retried immediately rather than staying in backoff.
 */
const offlineRetryCounts = new Map<string, number>();

/** Consecutive OFFLINE cycles before a node is dropped from the sweep. */
const OFFLINE_RETRY_LIMIT = 3;

// Request browser notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    pollerState.notificationPermission = 'unsupported';
    return 'unsupported';
  }

  try {
    const res = await Notification.requestPermission();
    pollerState.notificationPermission = res;
    return res;
  } catch (e) {
    console.warn('Could not request notification permission:', e);
    return 'default';
  }
}

// Dispatch browser notification on critical sensor failure
export function sendCriticalNotification(districtName: string, state: string, faultCode: string, message: string) {
  logVayuEvent({
    districtId: districtName.toLowerCase().replace(/\s+/g, '-'),
    districtName,
    state,
    faultCode,
    severity: 'CRITICAL',
    message
  });

  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(`⚠ Vayu Alert — ${districtName}, ${state}`, {
      body: `${faultCode} — ${message}`,
      // Was '/icon.png', which does not exist in public/ — every critical
      // notification rendered with a broken icon. This file is present.
      icon: '/metshield-logo.jpg',
      tag: `vayu-crit-${districtName}`,
    });

    notif.onclick = () => {
      window.focus();
    };
  } catch (e) {
    console.warn('Notification error:', e);
  }
}

// Main 30-second cycle runner
async function runPollerCycle() {
  if (!pollerState.running) return;

  // If user has switched tabs, reduce poller work
  if (typeof document !== 'undefined' && document.hidden) return;

  const now = Date.now();
  pollerState.lastCycleTimestamp = now;
  pollerState.totalCyclesCompleted++;

  // Evaluate which districts are due for adaptive refresh
  for (const d of ALL_766_DISTRICTS) {
    const health = getDistrictHealth(d.id);

    if (health === 'OFFLINE') {
      const retries = (offlineRetryCounts.get(d.id) ?? 0) + 1;
      offlineRetryCounts.set(d.id, retries);
      if (retries > OFFLINE_RETRY_LIMIT) {
        // Genuinely unreachable node: stop hammering the provider until it
        // recovers on its own. Previously this branch was unreachable because
        // the counter was never incremented.
        continue;
      }
      // Offline but still under the limit: retry, at raised priority so a
      // transient network fault is recovered quickly.
      enqueueDistrictFetch(d.id, 60);
      continue;
    }

    // Node is reachable (or never fetched) — clear the backoff.
    offlineRetryCounts.delete(d.id);

    // Adaptive priority: nodes needing attention refresh sooner.
    enqueueDistrictFetch(
      d.id,
      health === 'CRITICAL' ? 80 : health === 'DEGRADED' ? 40 : 5
    );
  }
}

/**
 * Begin background loop
 */
export function startPoller() {
  if (pollerState.running) return;
  pollerState.running = true;

  // Initialize engine and first batch
  initializeDistrictEngine();

  // Ask for notification permission if not asked
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    requestNotificationPermission();
  }

  // Run cycle every 30 seconds
  pollerIntervalId = setInterval(runPollerCycle, 30000);
}

/**
 * Freeze all background polling
 */
export function pausePoller() {
  pollerState.running = false;
  if (pollerIntervalId) {
    clearInterval(pollerIntervalId);
    pollerIntervalId = null;
  }
}

/**
 * Get poller diagnostics
 */
export function getPollerStatus(): PollerState {
  return { ...pollerState };
}

/**
 * Force reset and re-fetch all districts
 */
export function forceRefreshAll() {
  import('./india766Districts').then(({ ALL_766_DISTRICTS }) => {
    for (const d of ALL_766_DISTRICTS) {
      enqueueDistrictFetch(d.id, 90);
    }
  });
}
