'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStationProfile, IMDStationProfile } from '@/lib/stationData';
import { fetchLiveStationObservation, LiveObservation } from '@/lib/liveWeatherService';

export interface UseLiveStationWeatherResult {
  /**
   * `null` when `stationId` is not in the registry. Previously this silently
   * resolved to Safdarjung, so a caller could render Delhi's live weather under
   * another station's name. Callers must handle the null case.
   */
  station: IMDStationProfile | null;
  observation: LiveObservation | null;
  isLoading: boolean;
  error: string | null;
  lastUpdatedIST: string | null;
  refetch: () => Promise<LiveObservation | null>;
}

/**
 * React hook to fetch and stream real-time meteorological observations
 * for any registered IMD AWS station using Open-Meteo / Weatherstack public APIs.
 *
 * @param stationId The IMD station identifier (e.g., 'AWS-DEL-04')
 * @param pollIntervalMs Automatic polling interval in milliseconds (default: 30000ms)
 */
export function useLiveStationWeather(
  stationId: string,
  pollIntervalMs = 30000
): UseLiveStationWeatherResult {
  const station = getStationProfile(stationId);
  const [observation, setObservation] = useState<LiveObservation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchWeather = useCallback(async (): Promise<LiveObservation | null> => {
    if (!station) return null;
    setIsLoading(true);
    try {
      const obs = await fetchLiveStationObservation(station);
      if (isMountedRef.current) {
        setObservation(obs);
        setError(null);
      }
      return obs;
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch live station observation';
        setError(msg);
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [station]);

  useEffect(() => {
    let cancelled = false;
    const initialTimer = setTimeout(() => {
      if (!cancelled) {
        fetchWeather();
      }
    }, 0);

    let intervalTimer: NodeJS.Timeout | null = null;
    let handleVisibilityChange: (() => void) | null = null;

    if (pollIntervalMs > 0) {
      intervalTimer = setInterval(() => {
        // Pause network requests if tab is in background to protect server compute
        if (typeof document !== 'undefined' && document.hidden) return;
        fetchWeather();
      }, pollIntervalMs);

      handleVisibilityChange = () => {
        if (typeof document !== 'undefined' && !document.hidden) {
          fetchWeather();
        }
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      if (intervalTimer) clearInterval(intervalTimer);
      if (handleVisibilityChange && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [fetchWeather, pollIntervalMs]);

  return {
    station: station ?? null,
    observation,
    isLoading,
    error,
    lastUpdatedIST: observation?.timeIST || null,
    refetch: fetchWeather,
  };
}
