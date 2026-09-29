'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { runScenario, type ScenarioId } from '@/lib/networkFeed';
import { type TelemetryPacket } from '@/lib/anomalyLogic';

type SystemMode = 'SIMULATED_REPLAY' | 'LIVE' | 'DERIVED';

interface SystemState {
  mode: SystemMode;
  scenario: ScenarioId | null;
  selectedStationId: string | null;
  packets: TelemetryPacket[];
}

interface SystemContextType {
  state: SystemState;
  setScenario: (scenario: ScenarioId) => void;
  selectStation: (stationId: string | null) => void;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SystemState>({
    mode: 'SIMULATED_REPLAY',
    scenario: null,
    selectedStationId: null,
    packets: [],
  });

  const setScenario = useCallback((scenario: ScenarioId) => {
    const runs = runScenario(scenario);
    // Combine all packets from all stations in the scenario
    const allPackets = runs.flatMap(r => r.packets);
    setState(prev => ({
      ...prev,
      scenario,
      packets: allPackets,
    }));
  }, []);

  const selectStation = useCallback((stationId: string | null) => {
    setState(prev => ({ ...prev, selectedStationId: stationId }));
  }, []);

  const value = useMemo(() => ({ state, setScenario, selectStation }), [state, setScenario, selectStation]);

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (!context) throw new Error('useSystem must be used within SystemProvider');
  return context;
}
