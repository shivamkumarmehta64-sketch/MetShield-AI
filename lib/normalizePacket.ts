import { TelemetryPacket, WMOQualityFlag } from './anomalyLogic';
import { QCValidationResult } from './anomalyDetector';

/**
 * Maps the client-side anomalyDetector (QCValidationResult) vocabulary onto the
 * server-side anomalyLogic (TelemetryPacket) vocabulary, so UI components can
 * accept one unified shape regardless of which engine is driving the stream.
 */
export function normalizeClientVerdict(
  packetId: string,
  stationId: string,
  timestamp: number,
  timeIST: string,
  verdict: QCValidationResult,
  extra?: { windSpeedKph?: number; windDirectionDeg?: number; rainfallMm10min?: number, ticketId?: string }
): TelemetryPacket {

  // Map the disparate WMO flags.
  let mappedFlag: WMOQualityFlag = 'FLAG_1_VERIFIED_GOOD';
  if (verdict.wmoFlag === 'FLAG_2_CONVECTIVE_STORM') mappedFlag = 'FLAG_2_CONVECTIVE_STORM';
  else if (verdict.wmoFlag === 'FLAG_3_SUSPECT') mappedFlag = 'FLAG_3_SUSPECT_DRIFT';
  else if (verdict.wmoFlag === 'FLAG_4_CORRUPT_HARDWARE') mappedFlag = 'FLAG_4_CORRUPT_HARDWARE';

  // Map arbitrary severities into the government alert levels.
  let alertLevel: TelemetryPacket['alertLevel'] = 'LEVEL_0_NOMINAL';
  if (verdict.severity === 'BLUE_GENUINE_WEATHER') alertLevel = 'LEVEL_2_YELLOW'; // No blue alert level in domain model
  else if (verdict.severity === 'AMBER_PROBE_FREEZE') alertLevel = 'LEVEL_3_AMBER';
  else if (verdict.severity === 'RED_HARDWARE_FAULT') alertLevel = 'LEVEL_4_RED';

  // Client-side QC has no crypto, no geofence and no ML model behind it. The seal is
  // marked `UNSEALED_LOCAL` / `NOT_VERIFIED` rather than forged, so nothing downstream
  // can read a simulated packet as a signed one. `authentic` is the single bit the
  // console uses to distinguish a server-verified packet from a bench-injected one.
  const securitySeal: TelemetryPacket['securitySeal'] = {
    hmacSha256: '',
    antiReplayNonce: 0,
    auditMerkleRoot: '',
    geofenceStatus: 'NOT_VERIFIED',
    tamperStatus: 'UNSEALED_LOCAL',
    authentic: false
  };

  return {
    packetId,
    stationId,
    timestamp,
    timeIST,
    raw: {
      temperature: verdict.raw.temperature,
      pressure: verdict.raw.pressure,
      humidity: verdict.raw.humidity,
      windSpeedKph: extra?.windSpeedKph ?? null,
      windDirectionDeg: extra?.windDirectionDeg ?? null,
      rainfallMm10min: extra?.rainfallMm10min ?? null
    },
    imputed: {
      temperature: verdict.imputed.temperature,
      pressure: verdict.imputed.pressure,
      humidity: verdict.imputed.humidity,
      windSpeedKph: extra?.windSpeedKph ?? Math.round(Math.random() * 20),
      windDirectionDeg: extra?.windDirectionDeg ?? Math.floor(Math.random() * 360),
      rainfallMm10min: extra?.rainfallMm10min ?? 0,
      wasCorrected: verdict.imputed.wasImputed
    },
    ratesOfChange: {
      tempRoC: verdict.deltas.deltaT,
      pressRoC: verdict.deltas.deltaP,
      humRoC: verdict.deltas.deltaRH,
      windRoC: 0
    },
    classification: (verdict.classification === 'GENUINE_WEATHER_EVENT' ? 'GENUINE_CONVECTIVE_EVENT' :
                    verdict.classification === 'HARDWARE_FAULT' || verdict.classification === 'PHYSICAL_LIMIT_EXCEEDED' ? 'SENSOR_SPIKE' :
                    verdict.classification === 'PROBE_FREEZE' ? 'FROZEN_VALUE' :
                    verdict.classification) as TelemetryPacket['classification'],
    wmoFlag: mappedFlag,
    alertLevel,
    faultProbability: verdict.isValid ? 0.05 : 0.98,
    xaiAttribution: {
      tempWeight: verdict.xai.tempWeight,
      pressWeight: verdict.xai.pressWeight,
      humWeight: verdict.xai.humWeight,
      primaryParameter: verdict.xai.primaryParameter,
      diagnosticNote: verdict.xai.diagnosticExplanation
    },
    // No ML model runs on this path — `classifyAnomaly` is server-side only. Emitting a
    // fabricated confidence here would make the console's "ML agrees with rules" readout
    // assert a second opinion that was never computed. Confidence 0 is the honest value
    // for "no model ran"; `agreesWithRules: true` records that the rules engine stood alone.
    mlPrediction: {
      mlClassification: 'NOT_EVALUATED',
      mlConfidence: 0,
      agreesWithRules: true
    },
    operationalAction: verdict.recommendedAction,
    ticketId: extra?.ticketId ?? null,
    securitySeal
  };
}
