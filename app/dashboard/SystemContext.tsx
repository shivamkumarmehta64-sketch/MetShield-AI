'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  buildLiveNetworkSnapshot,
  buildScenarioSnapshot,
  getNetworkSnapshot,
  runScenario,
  type NetworkSnapshot,
  type ScenarioId,
} from '@/lib/networkFeed';
import { NICWMOAnomalyEngine, type TelemetryPacket } from '@/lib/anomalyLogic';
import { type LiveObservation } from '@/lib/liveWeatherService';

type SystemMode = 'SIMULATED_REPLAY' | 'LIVE' | 'DERIVED';

interface SystemState {
  mode: SystemMode;
  scenario: ScenarioId | null;
  selectedStationId: string | null;
  packets: TelemetryPacket[];
  snapshot: NetworkSnapshot;
  scenarioHistories: Record<string, TelemetryPacket[]>;
  liveLastSyncedAt: number | null;
}

interface SystemContextType {
  state: SystemState;
  setScenario: (scenario: ScenarioId) => void;
  selectStation: (stationId: string | null) => void;
  resumeLive: () => void;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SystemState>(() => ({
    mode: 'SIMULATED_REPLAY',
    scenario: null,
    selectedStationId: null,
    packets: [],
    snapshot: getNetworkSnapshot(),
    scenarioHistories: {},
    liveLastSyncedAt: null,
  }));

  const liveEngineRef = useRef<NICWMOAnomalyEngine | null>(null);
  const liveHistoriesRef = useRef<Record<string, TelemetryPacket[]>>({});
  const scenarioRef = useRef<ScenarioId | null>(null);

  useEffect(() => {
    scenarioRef.current = state.scenario;
  }, [state.scenario]);

  const fetchAndApplyLive = useCallback(async (force = false) => {
    if (!force && scenarioRef.current !== null) return;
    try {
      const res = await fetch('/api/weather/network');
      if (!res.ok) return;
      const payload = (await res.json()) as {
        success?: boolean;
        observations?: Record<string, LiveObservation>;
        fetchedAt?: number;
      };
      if (!payload?.success || !payload.observations) return;
      if (!force && scenarioRef.current !== null) return;

      if (!liveEngineRef.current) {
        liveEngineRef.current = new NICWMOAnomalyEngine();
      }
      const { snapshot, histories } = buildLiveNetworkSnapshot(
        payload.observations,
        liveEngineRef.current,
        liveHistoriesRef.current
      );
      liveHistoriesRef.current = histories;

      if (snapshot.dataMode === 'LIVE') {
        setState((prev) => ({
          ...prev,
          mode: 'LIVE',
          scenario: force ? null : prev.scenario,
          packets: force ? [] : prev.packets,
          snapshot,
          scenarioHistories: histories,
          liveLastSyncedAt: payload.fetchedAt ?? Date.now(),
        }));
      }
    } catch {
      // Keep existing benchmark snapshot honestly on network failure
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void fetchAndApplyLive(false);
    }, 0);
    const pollTimer = setInterval(() => {
      void fetchAndApplyLive(false);
    }, 60_000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
    };
  }, [fetchAndApplyLive]);

  const setScenario = useCallback((scenario: ScenarioId) => {
    scenarioRef.current = scenario;
    const runs = runScenario(scenario);
    const allPackets = runs.flatMap((r) => r.packets);
    const snapshot = buildScenarioSnapshot(scenario, runs);
    const scenarioHistories: Record<string, TelemetryPacket[]> = {};
    for (const run of runs) {
      scenarioHistories[run.stationId] = run.packets;
    }
    setState((prev) => ({
      ...prev,
      mode: 'SIMULATED_REPLAY',
      scenario,
      packets: allPackets,
      snapshot,
      scenarioHistories,
      selectedStationId:
        scenario === 'normal' ? null : (runs[0]?.stationId ?? prev.selectedStationId),
    }));
  }, []);

  const resumeLive = useCallback(() => {
    scenarioRef.current = null;
    void fetchAndApplyLive(true);
  }, [fetchAndApplyLive]);

  const selectStation = useCallback((stationId: string | null) => {
    setState((prev) => ({ ...prev, selectedStationId: stationId }));
  }, []);

  const value = useMemo(
    () => ({ state, setScenario, selectStation, resumeLive }),
    [state, setScenario, selectStation, resumeLive]
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (!context) throw new Error('useSystem must be used within SystemProvider');
  return context;
}
