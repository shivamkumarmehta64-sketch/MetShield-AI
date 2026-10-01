'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TelemetryPacket } from '@/lib/anomalyLogic';
import type { StationDataSource } from '@/lib/dataProvenance';

export interface StationLiveStatus {
  stationId: string;
  source: StationDataSource;
  lastUpdated: number;
  isStale: boolean;
  packet: TelemetryPacket | null;
}

export function useLiveNetwork(pollIntervalMs = 3500) {
  const [livePackets, setLivePackets] = useState<TelemetryPacket[]>([]);
  const [stationStatuses, setStationStatuses] = useState<Record<string, StationLiveStatus>>({});
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const lastTimestampRef = useRef<number>(0);

  const fetchLatest = useCallback(async () => {
    if (typeof window === 'undefined' || document.hidden) {
      return;
    }

    try {
      const res = await fetch(`/api/telemetry?latest=true&since=${lastTimestampRef.current}`);
      if (!res.ok) return;

      const body = await res.json();
      if (body.success && Array.isArray(body.packets) && body.packets.length > 0) {
        const incoming: TelemetryPacket[] = body.packets;
        const maxTs = Math.max(...incoming.map((p) => p.timestamp));
        lastTimestampRef.current = Math.max(lastTimestampRef.current, maxTs);

        setLivePackets((prev) => [...incoming, ...prev].slice(0, 50));
        setLastSync(new Date());

        setStationStatuses((prev) => {
          const next = { ...prev };
          for (const p of incoming) {
            const rawSource =
              (p as unknown as { sensorSource?: string; source?: string }).sensorSource ??
              (p as unknown as { source?: string }).source;

            let source: StationDataSource = 'BENCHMARK';
            if (rawSource === 'LIVE_MOBILE_SENSOR' || rawSource === 'LIVE_DEVICE') {
              source = 'LIVE_DEVICE';
            } else if (typeof rawSource === 'string' && (rawSource.includes('Open-Meteo') || rawSource === 'PUBLIC_MODEL_API')) {
              source = 'PUBLIC_MODEL_API';
            } else if (rawSource === 'REPLAY') {
              source = 'REPLAY';
            } else if (rawSource === 'SIMULATED') {
              source = 'SIMULATED';
            } else if (rawSource === 'BENCHMARK') {
              source = 'BENCHMARK';
            }

            next[p.stationId] = {
              stationId: p.stationId,
              source,
              lastUpdated: p.timestamp,
              isStale: false,
              packet: p,
            };
          }
          return next;
        });
      }
    } catch {
      // Non-blocking background poll failure
    }
  }, []);

  // Polling timer with visibility protection
  useEffect(() => {
    if (!isPolling) return;

    const timer = setInterval(fetchLatest, pollIntervalMs);
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchLatest();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchLatest, isPolling, pollIntervalMs]);

  // Stale status check (mark STALE if no packets within 3x interval or 15s)
  useEffect(() => {
    const staleTimer = setInterval(() => {
      const now = Date.now();
      const threshold = pollIntervalMs * 3;

      setStationStatuses((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, status] of Object.entries(next)) {
          if (!status.isStale && now - status.lastUpdated > threshold) {
            next[id] = { ...status, isStale: true };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 4000);

    return () => clearInterval(staleTimer);
  }, [pollIntervalMs]);

  return {
    livePackets,
    stationStatuses,
    lastSync,
    isPolling,
    setIsPolling,
    refresh: fetchLatest,
  };
}
