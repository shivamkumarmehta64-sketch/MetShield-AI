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

  // Construct a dummy security seal since client simulations don't have real crypto
  const securitySeal: TelemetryPacket['securitySeal'] = {
    hmacSha256: 'sim_00000000000000000000000000000000000000000000',
    antiReplayNonce: Math.floor(Math.random() * 1000000),
    auditMerkleRoot: 'sim_root_0000000000000000000000000000000',
    geofenceStatus: 'VERIFIED_IN_BOUNDS',
    tamperStatus: 'AUTHENTIC'
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
    mlPrediction: {
      mlClassification: verdict.classification,
      mlConfidence: 0.99,
      agreesWithRules: true
    },
    operationalAction: verdict.recommendedAction,
    ticketId: extra?.ticketId ?? null,
    securitySeal
  };
}
