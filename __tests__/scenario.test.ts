import { describe, it, expect } from 'vitest';
import {
  buildLiveNetworkSnapshot,
  buildScenarioSnapshot,
  computeKpis,
  runScenario,
} from '../lib/networkFeed';

describe('Scenario Engine Regression Tests', () => {
  it('should distinguish normal operation', () => {
    const runs = runScenario('normal');
    expect(runs.flatMap(r => r.packets).every(p => p.classification === 'NOMINAL_OPERATION')).toBe(true);
  });

  it('should detect storm', () => {
    const runs = runScenario('convective-storm');
    expect(runs.flatMap(r => r.packets).some(p => p.classification === 'GENUINE_CONVECTIVE_EVENT')).toBe(true);
  });

  it('should detect spike', () => {
    const runs = runScenario('temp-spike');
    expect(runs.flatMap(r => r.packets).some(p => p.classification === 'SENSOR_SPIKE')).toBe(true);
  });

  it('should detect freeze', () => {
    const runs = runScenario('frozen');
    expect(runs.flatMap(r => r.packets).some(p => p.classification === 'FROZEN_VALUE')).toBe(true);
  });
  
  it('should detect drift', () => {
    const runs = runScenario('drift');
    expect(runs.flatMap(r => r.packets).some(p => p.classification === 'CALIBRATION_DRIFT')).toBe(true);
  });

  it('overlays scenario runs onto NetworkSnapshot and resets all stations on normal', () => {
    const stormSnap = buildScenarioSnapshot('convective-storm');
    expect(stormSnap.byId['AWS-CHN-03']?.health).toBe('WEATHER_EVENT');
    expect(stormSnap.dataMode).toBe('REPLAY');

    const resetSnap = buildScenarioSnapshot('normal');
    const kpis = computeKpis(resetSnap);
    expect(kpis.nominal).toBe(kpis.total);
    expect(kpis.activeAnomalies).toBe(0);
  });

  it('builds a LIVE network snapshot only when real observations are present', () => {
    const emptyLive = buildLiveNetworkSnapshot({});
    expect(emptyLive.snapshot.dataMode).toBe('BENCHMARK');

    const { snapshot } = buildLiveNetworkSnapshot({
      'AWS-DEL-04': {
        stationId: 'AWS-DEL-04',
        temperature: 24.6,
        pressure: 1014.2,
        humidity: 58.0,
        windSpeedKph: 9.4,
        windDirectionDeg: 290,
        rainfallMm10min: 0,
        timestamp: Date.UTC(2026, 10, 11, 13, 30, 0),
        timeIST: '19:00:00',
        source: 'OPEN_METEO_PUBLIC_API',
        isLive: true,
      },
    });
    expect(snapshot.dataMode).toBe('LIVE');
    expect(snapshot.byId['AWS-DEL-04']?.packet.raw.temperature).toBe(24.6);
    expect(snapshot.byId['AWS-DEL-04']?.packet.raw.pressure).toBe(1014.2);
    expect(snapshot.byId['AWS-DEL-04']?.health).toBe('NOMINAL');
  });
});
