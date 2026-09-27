import { describe, it, expect, beforeEach } from 'vitest';
import { NICWMOAnomalyEngine, calculateQnhPressure } from '../lib/anomalyLogic';
import { persistTelemetryToEdge, resolveWorkOrderOnEdge } from '../lib/d1Adapter';

describe('NICWMOAnomalyEngine', () => {
  let engine: NICWMOAnomalyEngine;
  const stationId = 'AWS-DEL-04'; // Known station

  beforeEach(() => {
    engine = new NICWMOAnomalyEngine();
  });

  it('nominal observations get FLAG_1_VERIFIED_GOOD', () => {
    const pkt = engine.generatePacket(stationId);
    expect(pkt.wmoFlag).toBe('FLAG_1_VERIFIED_GOOD');
    expect(pkt.classification).toBe('NOMINAL_OPERATION');
  });

  it('thermistor spike injection produces FLAG_4_CORRUPT_HARDWARE with SENSOR_SPIKE classification', () => {
    engine.triggerThermistorSpike(stationId);
    let pkt = engine.generatePacket(stationId); // tick 1
    pkt = engine.generatePacket(stationId); // tick 2
    expect(pkt.wmoFlag).toBe('FLAG_4_CORRUPT_HARDWARE');
    expect(pkt.classification).toBe('SENSOR_SPIKE');
  });

  it('frozen value injection produces FLAG_4_CORRUPT_HARDWARE with FROZEN_VALUE classification', () => {
    engine.triggerWireDisconnectFreeze(stationId);
    let pkt;
    for (let i = 0; i < 7; i++) {
      pkt = engine.generatePacket(stationId);
    }
    expect(pkt!.wmoFlag).toBe('FLAG_4_CORRUPT_HARDWARE');
    expect(pkt!.classification).toBe('FROZEN_VALUE');
  });

  it('barometer drift injection produces FLAG_3_SUSPECT_DRIFT', () => {
    engine.triggerBarometerDrift(stationId);
    let pkt;
    for (let i = 0; i < 5; i++) {
      pkt = engine.generatePacket(stationId);
    }
    expect(pkt!.wmoFlag).toBe('FLAG_3_SUSPECT_DRIFT');
    expect(pkt!.classification).toBe('CALIBRATION_DRIFT');
  });

  it('convective storm injection produces FLAG_2_CONVECTIVE_STORM (NOT a sensor fault)', () => {
    engine.generatePacket(stationId); // baseline
    engine.triggerConvectiveStorm(stationId);
    const pkt = engine.generatePacket(stationId); // tick 1 jump
    expect(pkt.wmoFlag).toBe('FLAG_2_CONVECTIVE_STORM');
    expect(pkt.classification).toBe('GENUINE_CONVECTIVE_EVENT');
  });

  it('packet loss (null values) produces FLAG_5_PACKET_LOSS', () => {
    engine.triggerPacketLoss(stationId);
    const pkt = engine.generatePacket(stationId);
    expect(pkt.wmoFlag).toBe('FLAG_5_PACKET_LOSS');
    expect(pkt.classification).toBe('TELEMETRY_PACKET_LOSS');
  });

  it('WMA imputation produces non-null imputed values even when raw values are null', () => {
    // Generate nominal packets to populate buffer
    for (let i = 0; i < 5; i++) {
      engine.generatePacket(stationId);
    }
    engine.triggerPacketLoss(stationId);
    const pkt = engine.generatePacket(stationId);
    expect(pkt.raw.temperature).toBeNull();
    expect(pkt.imputed.temperature).not.toBeNull();
    expect(typeof pkt.imputed.temperature).toBe('number');
  });

  it('spatial cross-validation returns REGIONAL_WEATHER when multiple neighbors are anomalous', () => {
    engine.generatePacket('AWS-DEL-04');
    engine.triggerConvectiveStorm('AWS-DEL-04');
    const pkt1 = engine.generatePacket('AWS-DEL-04');

    engine.generatePacket('AWS-AGR-19'); // ~176km
    engine.triggerConvectiveStorm('AWS-AGR-19');
    const pkt2 = engine.generatePacket('AWS-AGR-19');

    engine.generatePacket('AWS-JAI-09'); // ~238km
    engine.triggerConvectiveStorm('AWS-JAI-09');
    const pkt3 = engine.generatePacket('AWS-JAI-09');

    const allLatest: Record<string, import('@/lib/anomalyLogic').TelemetryPacket> = {
      'AWS-DEL-04': pkt1,
      'AWS-AGR-19': pkt2,
      'AWS-JAI-09': pkt3
    };

    const result = engine.spatialCrossValidate('AWS-DEL-04', pkt1.classification, allLatest);
    expect(result.verdict).toBe('REGIONAL_WEATHER');
  });

  it('XAI attribution weights sum to approximately 100%', () => {
    const pkt = engine.generatePacket(stationId);
    const sum = pkt.xaiAttribution.tempWeight + pkt.xaiAttribution.pressWeight + pkt.xaiAttribution.humWeight;
    expect(sum).toBeGreaterThanOrEqual(99.9);
    expect(sum).toBeLessThanOrEqual(100.1);
  });

  it('security seal HMAC is generated for every packet', () => {
    const pkt = engine.generatePacket(stationId);
    expect(pkt.securitySeal).toBeDefined();
    expect(pkt.securitySeal.hmacSha256).toMatch(/^0x[0-9a-f]+$/);
  });

  it('calculates orographic QNH pressure reduction correctly for elevated stations', () => {
    // HAL Bengaluru: Elevation ~920m, station pressure ~910 hPa at 25°C
    const qnh = calculateQnhPressure(910.0, 920, 25.0);
    expect(qnh).toBeGreaterThan(910.0);
    expect(qnh).toBeCloseTo(1010.5, 0); // Sea-level equivalent should be around standard ~1010 hPa
  });

  it('applies bidirectional field calibration offset to eliminate sensor drift', () => {
    engine.triggerBarometerDrift(stationId);
    for (let i = 0; i < 6; i++) engine.generatePacket(stationId);

    // Apply technician offset of +2.7 hPa
    const calib = engine.applyFieldCalibration(stationId, 2.7);
    expect(calib.success).toBe(true);
    expect(engine.getStationDrift(stationId)).toBeGreaterThan(-1.0);
  });

  it('rejects a temperature offset instead of silently discarding it', () => {
    // applyFieldCalibration used to accept `tempOffset` and ignore it, returning
    // success: true. On a calibration function that means the audit trail
    // claims a correction that was never applied.
    const before = engine.getStationDrift(stationId);

    const rejected = engine.applyFieldCalibration(stationId, 0, 2.5);
    expect(rejected.success).toBe(false);
    expect(rejected.message).toMatch(/not implemented/i);
    // And crucially: no state change.
    expect(engine.getStationDrift(stationId)).toBe(before);

    // A barometric-only call still works.
    const applied = engine.applyFieldCalibration(stationId, 1.5);
    expect(applied.success).toBe(true);
    expect(applied.newDriftOffset).toBeCloseTo(before + 1.5, 2);
  });

  it('reports durable vs fallback storage honestly when no D1 binding exists', async () => {
    // UPDATED BEHAVIOUR. This test previously asserted
    //   expect(persistResult.persisted).toBe(true)
    // which was asserting the bug: with no D1 binding, the packet only lands in
    // a process-local array capped at 200 entries and lost on the next cold
    // start, yet the adapter reported success. A caller building an audit trail
    // would treat that as a durable write.
    //
    // It now asserts the honest contract: the storage tier is named, and
    // `persisted` is false when the write was not durable.
    const pkt = engine.generatePacket(stationId);
    const persistResult = await persistTelemetryToEdge(pkt);

    expect(persistResult.storage).toBe('IN_MEMORY_FALLBACK');
    expect(persistResult.persisted).toBe(false);

    const resolveResult = await resolveWorkOrderOnEdge('WO-TEST-001', 'Technician replaced PT100 probe');
    expect(typeof resolveResult).toBe('boolean');
  });

  it('reports persisted:true only when a real D1 binding succeeds', async () => {
    // The positive case: with a working binding the adapter must still claim
    // success, so the honest-reporting change did not break the real path.
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as Parameters<typeof persistTelemetryToEdge>[1];

    const pkt = engine.generatePacket(stationId);
    const result = await persistTelemetryToEdge(pkt, fakeDb);

    expect(result.storage).toBe('D1_EDGE_SQLITE');
    expect(result.persisted).toBe(true);
  });
});
