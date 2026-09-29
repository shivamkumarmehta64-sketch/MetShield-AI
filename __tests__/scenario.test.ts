import { describe, it, expect } from 'vitest';
import { runScenario } from '../lib/networkFeed';

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
});
