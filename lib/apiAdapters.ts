import { TelemetryPacket } from './anomalyLogic';

/**
 * Mocks Setu API payment/payout trigger for Field Techs
 */
export async function triggerRepairPayout(techId: string, nodeLocation: string, amount: number = 500) {
  // In a real app, this hits https://prod.setu.co/api/v1/payouts
  console.log(`[SETU API] Authorizing ₹${amount} payout to technician ${techId} at ${nodeLocation}`);
  return new Promise((resolve) => setTimeout(() => resolve({
    status: 'SUCCESS',
    txnId: `SETU-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    amount,
    currency: 'INR'
  }), 1200));
}

/**
 * Mocks AIKosh model metadata retrieval
 */
export async function fetchAIKoshModelStatus() {
  // Real implementation would hit an AIKosh registry endpoint
  const statuses = [
    { modelName: 'IMD-Convective-V3', status: 'ACTIVE', lastUpdated: '2026-09-24T08:00:00Z' },
    { modelName: 'Anomaly-Baseline-V2', status: 'ACTIVE', lastUpdated: '2026-09-10T12:00:00Z' }
  ];
  return new Promise((resolve) => setTimeout(() => resolve(statuses), 400));
}

/**
 * Mocks Data.gov.in district climate baseline lookup
 */
export async function fetchClimateBaseline(districtId: string) {
  // Real app fetches from data.gov.in OGD catalog API
  console.log(`[Data.gov.in] Fetching 10-year baseline for district ${districtId}`);
  return new Promise((resolve) => setTimeout(() => resolve({
    districtId,
    tempMean: 31.2,
    tempMax: 45.5,
    pressureMean: 1004.1,
    humidityMean: 65,
    lastUpdate: '2026-01-01T00:00:00Z',
    source: 'data.gov.in'
  }), 800));
}
