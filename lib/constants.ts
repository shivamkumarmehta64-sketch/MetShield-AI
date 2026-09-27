import { IMD_AWS_STATIONS } from './stationData';

export interface OperationalUseCase {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: string;
  station: string;
  problemScenario: string;
  rawInput: { temp: string; press: string; hum: string };
  deltaInput: { deltaT: string; deltaP: string; deltaRH: string };
  neighborContext: string;
  aiClassification: string;
  wmoFlag: string;
  nwpStatus: 'APPROVED' | 'QUARANTINED' | 'CONDITIONAL';
  confidence: string;
  xai: {
    tempWeight: number;
    pressWeight: number;
    humWeight: number;
    dominant: string;
    explanation: string;
  };
  imputed: { temp: string; press: string; hum: string; method: string } | null;
  operationalAction: string;
  linkUrl: string;
  linkText: string;
}

export const OPERATIONAL_USE_CASES: OperationalUseCase[] = [
  {
    id: 'benchmark_55c',
    badge: 'Core Benchmark',
    title: 'Sudden +55°C Hardware Sensor Spike',
    subtitle: 'Isolated Single-Parameter Wire Open-Circuit Fault',
    icon: '⚡',
    station: 'AWS-DEL-04 (Safdarjung, New Delhi)',
    problemScenario: 'An AWS suddenly jumps from 29.4°C to 55.0°C with 92% RH while 5 surrounding Delhi stations (Lodhi Road, Palam, Ridge, Aya Nagar) report normal conditions (~30.1°C).',
    rawInput: { temp: '55.0°C', press: '1006.5 hPa', hum: '92.0%' },
    deltaInput: { deltaT: '+25.6°C', deltaP: '0.0 hPa', deltaRH: '+24.0%' },
    neighborContext: '5 nearest stations report ~30.1°C. Spatial Z-score = 8.4 confirms localized anomaly.',
    aiClassification: 'SENSOR_SPIKE (Transducer Lead Open-Circuit)',
    wmoFlag: 'WMO FLAG 4: CORRUPT_HARDWARE',
    nwpStatus: 'QUARANTINED',
    confidence: '96.0%',
    xai: {
      tempWeight: 86.5,
      pressWeight: 0.0,
      humWeight: 13.5,
      dominant: 'TEMPERATURE_SPIKE',
      explanation: 'Unphysical temperature rate-of-change (+25.6°C) without thermodynamic barometric coupling. Quarantined from GFS/WRF model assimilation.'
    },
    imputed: { temp: '29.6°C', press: '1006.5 hPa', hum: '54.3%', method: 'Hybrid WMA + Spatial Inverse Distance' },
    operationalAction: 'Telemetry quarantined. Corrected value substituted for model assimilation. Auto-dispatched NABL work order #WO-DEL-2026.',
    linkUrl: '/dashboard?station=AWS-DEL-04',
    linkText: 'Simulate in Operations Console'
  },
  {
    id: 'convective_storm',
    badge: 'Storm vs. Fault Discrimination',
    title: 'Severe Convective Squall (Kalbaisakhi)',
    subtitle: 'Coupled Atmospheric Cold Pool vs False Alarm',
    icon: '⛈️',
    station: 'AWS-KOL-02 (Alipore, Kolkata)',
    problemScenario: 'Violent pre-monsoon squall front causes rapid evaporative cooling (-4.3°C), microbarometric plunge (-3.1 hPa), and saturation surge (+24%). Traditional thresholds mistakenly reject this as a sensor fault!',
    rawInput: { temp: '27.2°C', press: '1005.1 hPa', hum: '86.0%' },
    deltaInput: { deltaT: '-4.3°C', deltaP: '-3.1 hPa', deltaRH: '+24.0%' },
    neighborContext: 'Doppler Weather Radar (DWR Kolkata) confirms high-reflectivity convective squall line approaching at 65 km/h.',
    aiClassification: 'GENUINE_CONVECTIVE_EVENT (Coupled Downdraft)',
    wmoFlag: 'WMO FLAG 2: CONVECTIVE_STORM',
    nwpStatus: 'APPROVED',
    confidence: '98.0%',
    xai: {
      tempWeight: 42.0,
      pressWeight: 35.0,
      humWeight: 23.0,
      dominant: 'CONVECTIVE_COLD_POOL_COUPLING',
      explanation: 'Multivariate atmospheric invariant satisfied: Synchronous ΔT, ΔP plunge, and ΔRH surge match Zahumenský § 4.3 criteria.'
    },
    imputed: null,
    operationalAction: 'VERIFIED GENUINE STORM. Gated to NWP assimilation. Broadcast regional Orange squall alert.',
    linkUrl: '/dashboard?station=AWS-KOL-02',
    linkText: 'Inspect Storm in Console'
  },
  {
    id: 'frozen_adc',
    badge: 'Hardware Deadlock',
    title: 'Datalogger ADC Deadlock (Frozen Sensor)',
    subtitle: 'Zero-Variance I2C Bus Hang Isolation',
    icon: '🧊',
    station: 'AWS-BLR-05 (HAL Airport, Bengaluru)',
    problemScenario: 'Datalogger Analog-to-Digital Converter locks up on the communication bus; transmits identical 24.500°C across 6 consecutive cycles without natural microbaric jitter.',
    rawInput: { temp: '24.5°C', press: '918.2 hPa', hum: '62.0%' },
    deltaInput: { deltaT: '0.000°C', deltaP: '0.000 hPa', deltaRH: '0.000%' },
    neighborContext: 'Atmospheric turbulence always exhibits micro-fluctuations (σ > 0.02). Zero variance indicates hardware freeze.',
    aiClassification: 'FROZEN_VALUE (ADC Deadlock)',
    wmoFlag: 'WMO FLAG 4: CORRUPT_HARDWARE',
    nwpStatus: 'QUARANTINED',
    confidence: '98.0%',
    xai: {
      tempWeight: 33.3,
      pressWeight: 33.3,
      humWeight: 33.4,
      dominant: 'ZERO_VARIANCE_ADC_FREEZE',
      explanation: 'Continuous zero-variance readings across 6 consecutive samples (Var = 0.000). Datalogger ADC deadlock identified.'
    },
    imputed: { temp: '24.5°C', press: '918.2 hPa', hum: '62.0%', method: 'Temporal Weighted Moving Average' },
    operationalAction: 'Quarantined station. Watchdog remote reboot command transmitted via INSAT-3D uplink.',
    linkUrl: '/dashboard?station=AWS-BLR-05',
    linkText: 'View Diagnostics in Console'
  },
  {
    id: 'sensor_drift',
    badge: 'Predictive Maintenance',
    title: 'Barometer Calibration Drift & Degradation',
    subtitle: 'Monotonic Transducer Aging & Auto-Imputation',
    icon: '📉',
    station: 'AWS-MUM-01 (Colaba, Mumbai)',
    problemScenario: 'Silicon capacitive pressure transducer drifts downwards by -2.40 hPa over a 24-hour window due to sensor diaphragm fatigue, while diurnal temperature cycle is normal.',
    rawInput: { temp: '30.1°C', press: '1007.2 hPa', hum: '75.5%' },
    deltaInput: { deltaT: '+0.1°C', deltaP: '-2.40 hPa (cumulative)', deltaRH: '+0.5%' },
    neighborContext: 'Coastal reference stations (Santacruz, Alibag) remain steady at 1010.2 hPa. No synoptic low pressure system present.',
    aiClassification: 'CALIBRATION_DRIFT (Transducer Fatigue)',
    wmoFlag: 'WMO FLAG 3: SUSPECT_DRIFT',
    nwpStatus: 'CONDITIONAL',
    confidence: '88.0%',
    xai: {
      tempWeight: 8.0,
      pressWeight: 85.0,
      humWeight: 7.0,
      dominant: 'BAROMETER_CALIBRATION_DRIFT',
      explanation: 'Monotonic cumulative drift exceeding 1.8 hPa running mean divergence without regional gradient.'
    },
    imputed: { temp: '30.0°C', press: '1008.4 hPa', hum: '75.0%', method: 'Running Mean Autoregression' },
    operationalAction: 'Conditional Gating: Substituted imputed pressure into NWP stream to prevent forecast degradation. Scheduled recalibration.',
    linkUrl: '/dashboard?station=AWS-MUM-01',
    linkText: 'Analyze Drift in Console'
  },
  {
    id: 'spatial_knn',
    badge: 'Spatial Network Consensus',
    title: 'Spatial KNN Multi-Station Cross-Validation',
    subtitle: 'Regional Network Consensus & Cohort Isolation',
    icon: '🗺️',
    station: 'AWS-DEL-04 vs. 5 Delhi NCR Stations',
    problemScenario: 'An isolated station reports a sudden +4.5 hPa pressure jump. Inverse Distance Weighting across 5 nearest cohort stations rejects the reading as impossible micro-high.',
    rawInput: { temp: '29.4°C', press: '1011.0 hPa', hum: '68.0%' },
    deltaInput: { deltaT: '0.0°C', deltaP: '+4.5 hPa (Local)', deltaRH: '0.0%' },
    neighborContext: '5 nearest stations within 25 km confirm flat regional gradient (|ΔP| < 0.3 hPa). Spatial Z-Score = 4.8.',
    aiClassification: 'SPATIAL_ANOMALY (Isolated Micro-High Rejection)',
    wmoFlag: 'WMO FLAG 4: CORRUPT_HARDWARE',
    nwpStatus: 'QUARANTINED',
    confidence: '97.5%',
    xai: {
      tempWeight: 5.0,
      pressWeight: 90.0,
      humWeight: 5.0,
      dominant: 'SPATIAL_INCOHERENCE',
      explanation: 'Spatial cross-validation against 5 neighboring AWS nodes reveals an unphysical pressure delta (Z-score > 4.5).'
    },
    imputed: { temp: '29.4°C', press: '1006.5 hPa', hum: '68.0%', method: 'Inverse Distance Weighting (IDW)' },
    operationalAction: 'Isolated station quarantined. Substituted cohort consensus into GFS/NCMRWF assimilation.',
    linkUrl: '/dashboard?tab=analytics',
    linkText: 'Open 766 District GIS Grid'
  },
  {
    id: 'mobile_node',
    badge: 'Edge Sensor Innovation',
    title: 'Mobile Smartphone as Calibrated AWS Node',
    subtitle: 'Crowdsourced Field Sensor Grid with W3C Sensor API',
    icon: '📱',
    station: 'AWS-MOB-01 (Smartphone Edge Node)',
    problemScenario: 'In remote or disaster-hit regions lacking $10,000 AWS towers, any standard smartphone functions as a live calibrated micro-observatory.',
    rawInput: { temp: '29.4°C', press: '1006.5 hPa (Silicon)', hum: '68.0%' },
    deltaInput: { deltaT: 'Physical Stream', deltaP: 'Hardware Barometer', deltaRH: 'Capacitive/API' },
    neighborContext: 'Auto-provisioned in National GIS mesh grid with live GPS coordinates, battery voltage, and compass wind vane.',
    aiClassification: 'MOBILE_GROUNDED_TELEMETRY (Physical Sensor)',
    wmoFlag: 'WMO FLAG 1: VERIFIED_GOOD',
    nwpStatus: 'APPROVED',
    confidence: '94.0%',
    xai: {
      tempWeight: 33.3,
      pressWeight: 33.3,
      humWeight: 33.4,
      dominant: 'PHYSICAL_HARDWARE_GROUNDING',
      explanation: 'Verified physical silicon pressure readings (BMP280/Generic Sensor API) paired with cryptographic HMAC-SHA256 envelope.'
    },
    imputed: { temp: 'Live Ambient', press: 'Physical Silicon', hum: 'Live Stream', method: 'Direct Hardware Telemetry' },
    operationalAction: 'Grounded to national GIS mesh. Cryptographic HMAC packet delivered to central QMS.',
    linkUrl: '/mobile',
    linkText: 'Open Mobile Sensor Node'
  }
];

export interface FeaturedObservatory {
  id: string;
  city: string;
  state: string;
  zone: string;
  temp: number;
  /**
   * MEAN SEA LEVEL pressure (hPa), matching `IMDStationProfile.baseline.pressureMean`.
   *
   * This list previously carried hand-entered STATION pressure (QFE) while
   * lib/stationData.ts carried sea-level pressure (QNH) for the same stations:
   * Bengaluru 918.2 vs 1013.2, Shimla 782.4, Leh 668.0. Two conventions, one
   * registry, 95-346 hPa of disagreement depending on elevation. Values are now
   * derived from the single registry rather than retyped.
   */
  press: number;
  hum: number;
  wind: number;
  windDir: string;
  elev: number;
  wmo: string;
  status: string;
  flag: string;
}

/** Climate descriptor per station, presentational only. */
const OBSERVATORY_ZONES: Record<string, string> = {
  'AWS-DEL-04': 'Indo-Gangetic Semi-Arid',
  'AWS-MUM-01': 'Western Coastal Marine',
  'AWS-KOL-02': 'Eastern Gangetic Delta',
  'AWS-BLR-05': 'Deccan Plateau Highland',
  'AWS-CHN-03': 'Coromandel Coastal',
  'AWS-SML-14': 'Western Himalayan Alpine',
  'AWS-SRN-17': 'Trans-Himalayan Cold Desert',
};

/** Which stations get a featured card, and the QC state to present for each. */
const FEATURED_STATION_IDS = [
  'AWS-DEL-04', 'AWS-MUM-01', 'AWS-KOL-02', 'AWS-BLR-05',
  'AWS-CHN-03', 'AWS-SML-14', 'AWS-SRN-17',
] as const;

const COMPASS: Record<number, string> = {
  0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW',
};
const toCompass = (deg: number | undefined): string =>
  deg === undefined ? '—' : (COMPASS[Math.round(deg / 45) % 8] ?? '—');

/**
 * Featured observatory cards, DERIVED from the single station registry.
 *
 * Everything except the climate zone and the presented QC state now comes from
 * IMD_AWS_STATIONS, so the two files can no longer disagree. Station ids
 * AWS-SHM-11 / AWS-LEH-14 / AWS-CHE-15 that used to appear here but not in the
 * registry are gone; the equivalent registered stations (AWS-SML-14 Shimla,
 * AWS-SRN-17 Srinagar) are used instead.
 */
export const FEATURED_OBSERVATORIES: FeaturedObservatory[] = FEATURED_STATION_IDS.map(
  (id): FeaturedObservatory => {
    const s = IMD_AWS_STATIONS.find((st) => st.stationId === id);
    if (!s) {
      // Fail loudly in development rather than rendering a half-empty card.
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          `FEATURED_OBSERVATORIES references unregistered station "${id}". ` +
            `Add it to lib/stationData.ts or remove it from FEATURED_STATION_IDS.`
        );
      }
      throw new Error(`Unregistered featured station: ${id}`);
    }
    return {
      id: s.stationId,
      city: s.name,
      state: s.state,
      zone: OBSERVATORY_ZONES[s.stationId] ?? 'Unclassified',
      temp: s.baseline.tempMean,
      press: s.baseline.pressureMean,
      hum: s.baseline.humidityMean,
      wind: s.baseline.windMean ?? 18,
      windDir: toCompass(s.baseline.windDirMean),
      elev: s.elevationM,
      wmo: s.wmoBlockNo,
      status: s.status === 'SCHEDULED_CALIBRATION' ? 'Scheduled Calibration' : 'Nominal Operation',
      flag: 'FLAG 1',
    };
  }
);