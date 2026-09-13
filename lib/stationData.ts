export interface IMDStationProfile {
  stationId: string;
  name: string;
  hindiName: string;
  state: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  rmcDivision: string;
  wmoBlockNo: string;
  sensorMetadata: {
    tempSensor: string;
    pressureSensor: string;
    humiditySensor: string;
    dataloggerModel: string;
    telemetryUplink: string;
    batteryVoltage: string;
    lastCalibDate: string;
    calibCertNo: string;
  };
  baseline: { tempMean: number; pressureMean: number; humidityMean: number; windMean?: number; windDirMean?: number };
  status?: 'OPERATIONAL' | 'SCHEDULED_CALIBRATION';
}

// Sensor kit templates — eliminates 21× string repetition
const KITS = {
  VS: { t: 'PT100 Class-A 4-Wire RTD (DIN EN 60751)', p: 'Vaisala PTB110 Silicon Capacitive Barometer', h: 'Vaisala Humicap 180R Thin-Film Polymer' },
  VR: { t: 'PT100 Class-A RTD', p: 'Vaisala PTB110 Barometer', h: 'Rotronic HC2A-S3' },
  VP: { t: 'PT100 Class-A RTD', p: 'Vaisala PTB110 Barometer', h: 'Vaisala Humicap 180R' },
  SR: { t: 'PT100 Class-A 4-Wire RTD (DIN EN 60751)', p: 'Setra Model 278 Barometric Transducer', h: 'Rotronic HygroClip2-S3' },
  SV: { t: 'PT100 Class-A RTD', p: 'Setra 278 Barometer', h: 'Vaisala Humicap 180R' },
  SH: { t: 'PT100 Class-A Heated RTD', p: 'Setra 278 Barometer', h: 'Rotronic HygroClip2-S3' },
  VH: { t: 'PT100 Class-A Heated RTD', p: 'Vaisala PTB110 Barometer', h: 'Vaisala Humicap Heated Sensor' },
  MOB: { t: 'Smartphone W3C / Battery Thermistor & Open-Meteo', p: 'Hardware Silicon Barometer (BMP280 / W3C Ambient)', h: 'High-Res Polymer Capacitive / Assimilated NWP' },
} as const;

type KitKey = keyof typeof KITS;

// Compact station definition — expanded at runtime
interface StationDef {
  id: string; n: string; hi: string; st: string;
  lat: number; lon: number; elev: number;
  rmc: string; wmo: string; kit: KitKey;
  dl: string; ul: string; bv: string; cd: string; cc: string;
  bl: [number, number, number, number?, number?]; // [tempMean, pressureMean, humidityMean, windMean?, windDirMean?]
  status?: 'OPERATIONAL' | 'SCHEDULED_CALIBRATION';
}

const STATIONS: StationDef[] = [
  { id:'AWS-DEL-04', n:'Safdarjung Observatory, New Delhi', hi:'सफदरजंग वेधशाला, नई दिल्ली', st:'Delhi (NCT)', lat:28.585, lon:77.206, elev:216, rmc:'RMC New Delhi', wmo:'42182', kit:'VS', dl:'Sutron 9210 XL DCP Logger', ul:'INSAT-3D UHF DCP (402.75 MHz) / BSNL VPN', bv:'12.42 V (Float Nominal)', cd:'14-Oct-2025', cc:'CC-IMD-NABL-DEL-2025-0914', bl:[31.8,1008.2,58.0,22,270] },
  { id:'AWS-MUM-01', n:'Colaba Observatory, Mumbai', hi:'कुलाबा वेधशाला, मुंबई', st:'Maharashtra', lat:18.900, lon:72.815, elev:11, rmc:'RMC Mumbai', wmo:'43057', kit:'VS', dl:'Campbell Scientific CR1000X', ul:'INSAT-3D UHF DCP (402.75 MHz) / MTNL 4G', bv:'12.65 V (Float Nominal)', cd:'02-Dec-2025', cc:'CC-IMD-NABL-MUM-2025-1102', bl:[29.5,1012.4,78.0,18,225] },
  { id:'AWS-KOL-02', n:'Alipore Meteorological Office, Kolkata', hi:'अलीपुर मौसम कार्यालय, कोलकाता', st:'West Bengal', lat:22.533, lon:88.333, elev:6, rmc:'RMC Kolkata', wmo:'42807', kit:'SR', dl:'Sutron 9210 XL DCP Logger', ul:'INSAT-3D UHF DCP (402.75 MHz) / Jio Enterprise', bv:'12.51 V (Float Nominal)', cd:'22-Nov-2025', cc:'CC-IMD-NABL-KOL-2025-0843', bl:[30.5,1011.6,82.0,24,180] },
  { id:'AWS-PUN-08', n:'Shivajinagar Agricultural Observatory, Pune', hi:'शिवाजीनगर कृषि वेधशाला, पुणे', st:'Maharashtra', lat:18.531, lon:73.855, elev:560, rmc:'RMC Mumbai', wmo:'43063', kit:'VS', dl:'Astra Micro AWS-200', ul:'INSAT-3D UHF DCP / BSNL GPRS VPN', bv:'12.38 V (Float Nominal)', cd:'19-Jan-2026', cc:'CC-IMD-NABL-PUN-2026-0041', bl:[28.2,1010.5,64.0,16,240] },
  { id:'AWS-CHN-03', n:'Meenambakkam Observatory, Chennai', hi:'मीनमबाक्कम वेधशाला, चेन्नई', st:'Tamil Nadu', lat:12.994, lon:80.181, elev:16, rmc:'RMC Chennai', wmo:'43279', kit:'VP', dl:'Campbell CR1000X', ul:'INSAT-3D UHF DCP / Airtel IoT', bv:'12.58 V (Float Nominal)', cd:'09-Jan-2026', cc:'CC-IMD-NABL-CHN-2026-0019', bl:[32.6,1010.8,74.0,20,200] },
  { id:'AWS-BLR-05', n:'HAL Airport Meteorological Facility, Bengaluru', hi:'एचएएल हवाई अड्डा मौसम सुविधा, बेंगलुरु', st:'Karnataka', lat:12.955, lon:77.668, elev:920, rmc:'RMC Chennai (MC Bengaluru)', wmo:'43295', kit:'VR', dl:'Sutron 9210 XL', ul:'INSAT-3D UHF DCP / BSNL VPN', bv:'12.44 V (Float Nominal)', cd:'15-Feb-2026', cc:'CC-IMD-NABL-BLR-2026-0112', bl:[26.8,1013.2,62.0,14,250] },
  { id:'AWS-HYD-06', n:'Begumpet Observatory, Hyderabad', hi:'बेगमपेट वेधशाला, हैदराबाद', st:'Telangana', lat:17.453, lon:78.467, elev:531, rmc:'RMC Chennai (MC Hyderabad)', wmo:'43128', kit:'SV', dl:'Astra Micro AWS-200', ul:'INSAT-3D UHF DCP / Jio Private APN', bv:'12.50 V (Float Nominal)', cd:'11-Nov-2025', cc:'CC-IMD-NABL-HYD-2025-0721', bl:[31.0,1009.5,56.0,17,235] },
  { id:'AWS-AHM-07', n:'Sardar Vallabhbhai Patel Airport, Ahmedabad', hi:'सरदार वल्लभभाई पटेल वेधशाला, अहमदाबाद', st:'Gujarat', lat:23.072, lon:72.630, elev:55, rmc:'RMC Mumbai (MC Ahmedabad)', wmo:'42647', kit:'VP', dl:'Sutron 9210 XL', ul:'INSAT-3D UHF DCP / Vodafone-Idea Gov VPN', bv:'12.39 V (Float Nominal)', cd:'27-Oct-2025', cc:'CC-IMD-NABL-AHM-2025-0688', bl:[33.8,1007.8,48.0,26,315] },
  { id:'AWS-JAI-09', n:'Sanganer Observatory, Jaipur', hi:'सांगानेर वेधशाला, जयपुर', st:'Rajasthan', lat:26.824, lon:75.812, elev:390, rmc:'RMC New Delhi (MC Jaipur)', wmo:'42348', kit:'VP', dl:'Campbell CR1000X', ul:'INSAT-3D UHF DCP / BSNL VPN', bv:'12.46 V (Float Nominal)', cd:'04-Dec-2025', cc:'CC-IMD-NABL-JAI-2025-0955', bl:[35.2,1006.8,42.0,28,290] },
  { id:'AWS-LKO-10', n:'Amausi Airport Meteorological Office, Lucknow', hi:'अमौसी वेधशाला, लखनऊ', st:'Uttar Pradesh', lat:26.760, lon:80.883, elev:123, rmc:'RMC New Delhi (MC Lucknow)', wmo:'42369', kit:'VR', dl:'Sutron 9210 XL', ul:'INSAT-3D UHF DCP / Airtel Gov VPN', bv:'12.52 V (Float Nominal)', cd:'16-Nov-2025', cc:'CC-IMD-NABL-LKO-2025-0812', bl:[32.5,1009.6,66.0,19,265] },
  { id:'AWS-BHP-11', n:'Bairagarh Observatory, Bhopal', hi:'बैरागढ़ वेधशाला, भोपाल', st:'Madhya Pradesh', lat:23.287, lon:77.348, elev:523, rmc:'RMC Nagpur (MC Bhopal)', wmo:'42667', kit:'VP', dl:'Astra Micro AWS-200', ul:'INSAT-3D UHF DCP / BSNL VPN', bv:'12.41 V (Float Nominal)', cd:'20-Oct-2025', cc:'CC-IMD-NABL-BHP-2025-0649', bl:[30.0,1010.2,54.0,20,255] },
  { id:'AWS-PAT-12', n:'Jay Prakash Narayan Airport, Patna', hi:'जयप्रकाश नारायण वेधशाला, पटना', st:'Bihar', lat:25.591, lon:85.088, elev:52, rmc:'RMC Kolkata (MC Patna)', wmo:'42492', kit:'VR', dl:'Sutron 9210 XL', ul:'INSAT-3D UHF DCP / Airtel IoT', bv:'12.48 V (Float Nominal)', cd:'08-Jan-2026', cc:'CC-IMD-NABL-PAT-2026-0015', bl:[31.6,1010.8,72.0,21,200] },
  { id:'AWS-GHY-13', n:'Borjhar Meteorological Centre, Guwahati', hi:'बोरझार मौसम केंद्र, गुवाहाटी', st:'Assam', lat:26.106, lon:91.586, elev:49, rmc:'RMC Guwahati', wmo:'42410', kit:'SV', dl:'Campbell CR1000X', ul:'INSAT-3D UHF DCP / BSNL Broadband', bv:'12.56 V (Float Nominal)', cd:'12-Dec-2025', cc:'CC-IMD-NABL-GHY-2025-0994', bl:[28.0,1012.2,86.0,22,180] },
  { id:'AWS-SML-14', n:'Shimla Ridge High-Altitude Observatory', hi:'शिमला रिज वेधशाला, शिमला', st:'Himachal Pradesh', lat:31.104, lon:77.173, elev:2205, rmc:'RMC New Delhi (MC Shimla)', wmo:'42083', kit:'VH', dl:'Sutron 9210 XL', ul:'INSAT-3D UHF DCP / BSNL VPN', bv:'12.68 V (Dual Solar System)', cd:'25-Jan-2026', cc:'CC-IMD-NABL-SML-2026-0062', bl:[21.0,1014.2,68.0,32,310] },
  { id:'AWS-TRV-15', n:'Palayam Tropical Observatory, Thiruvananthapuram', hi:'पालयम वेधशाला, तिरुवनंतपुरम', st:'Kerala', lat:8.506, lon:76.956, elev:15, rmc:'RMC Chennai (MC Thiruvananthapuram)', wmo:'43371', kit:'VR', dl:'Campbell CR1000X', ul:'INSAT-3D UHF DCP / BSNL VPN', bv:'12.45 V (Float Nominal)', cd:'18-Feb-2026', cc:'CC-IMD-NABL-TRV-2026-0138', bl:[29.4,1011.8,84.0,16,220] },
  { id:'AWS-NAG-16', n:'Sonegaon Meteorological Office, Nagpur', hi:'सोनेगांव वेधशाला, नागपुर', st:'Maharashtra', lat:21.100, lon:79.050, elev:310, rmc:'RMC Nagpur', wmo:'42867', kit:'VP', dl:'Sutron 9210 XL', ul:'INSAT-3D UHF DCP / Airtel Gov APN', bv:'12.40 V (Float Nominal)', cd:'30-Nov-2025', cc:'CC-IMD-NABL-NAG-2025-0877', bl:[32.2,1009.0,52.0,23,260] },
  { id:'AWS-SRN-17', n:'Sheikh ul-Alam Meteorological Station, Srinagar', hi:'शेख उल-आलम मौसम केंद्र, श्रीनगर', st:'Jammu & Kashmir (UT)', lat:34.000, lon:74.770, elev:1587, rmc:'RMC New Delhi (MC Srinagar)', wmo:'42027', kit:'SH', dl:'Campbell CR1000X', ul:'INSAT-3D UHF DCP / BSNL Fiber Fallback', bv:'12.72 V (Cold Climate Pack)', cd:'10-Feb-2026', cc:'CC-IMD-NABL-SRN-2026-0091', bl:[18.5,1015.0,65.0,30,300] },
  { id:'AWS-BBI-18', n:'Biju Patnaik Coastal Plains Observatory, Bhubaneswar', hi:'बीजू पटनायक वेधशाला, भुवनेश्वर', st:'Odisha', lat:20.244, lon:85.818, elev:42, rmc:'RMC Kolkata (MC Bhubaneswar)', wmo:'42971', kit:'VP', dl:'Astra Micro AWS-200', ul:'INSAT-3D UHF DCP / Jio VPN', bv:'12.49 V (Float Nominal)', cd:'05-Jan-2026', cc:'CC-IMD-NABL-BBI-2026-0008', bl:[31.2,1011.0,76.0,25,185] },
  { id:'AWS-AGR-19', n:'Kheria Civil Enclave Observatory, Agra', hi:'खेरिया वेधशाला, आगरा', st:'Uttar Pradesh', lat:27.156, lon:77.961, elev:169, rmc:'RMC New Delhi', wmo:'42266', kit:'VR', dl:'Sutron 9210 XL', ul:'INSAT-3D UHF DCP / BSNL VPN', bv:'12.43 V (Float Nominal)', cd:'17-Oct-2025', cc:'CC-IMD-NABL-AGR-2025-0611', bl:[33.4,1008.8,50.0,24,275] },
  { id:'AWS-VAP-20', n:'Visakhapatnam Cyclone Warning Centre AWS', hi:'चक्रवात चेतावनी केंद्र वेधशाला, विशाखापट्टनम', st:'Andhra Pradesh', lat:17.720, lon:83.300, elev:5, rmc:'RMC Chennai (MC Amaravati)', wmo:'43149', kit:'VP', dl:'Campbell CR1000X', ul:'INSAT-3D UHF DCP / BSNL Leased Line', bv:'12.54 V (Float Nominal)', cd:'28-Nov-2025', cc:'CC-IMD-NABL-VAP-2025-0862', bl:[30.2,1012.0,80.0,28,190], status:'SCHEDULED_CALIBRATION' },
  { id:'AWS-MOB-01', n:'Portable Mobile AWS Node (Field Smartphone / ESP32)', hi:'पोर्टेबल मोबाइल एडब्ल्यूएस नोड (फील्ड स्मार्टफोन / ESP32)', st:'Live GPS Field Uplink', lat:28.6139, lon:77.2090, elev:216, rmc:'RMC Field Operations', wmo:'49999', kit:'MOB', dl:'Mobile PWA Telemetry Edge Transmitter', ul:'4G/5G HTTPS DCP Telemetry / WebSocket', bv:'3.85 V (Li-ion Internal)', cd:'Live Auto-Calibrated', cc:'CC-IMD-NABL-MOB-01', bl:[29.5,1005.0,65.0,15,225], status:'OPERATIONAL' },
];

// Expand compact defs into full profiles at module load
function expand(s: StationDef): IMDStationProfile {
  const k = KITS[s.kit];
  return {
    stationId: s.id, name: s.n, hindiName: s.hi, state: s.st,
    latitude: s.lat, longitude: s.lon, elevationM: s.elev,
    rmcDivision: s.rmc, wmoBlockNo: s.wmo,
    sensorMetadata: {
      tempSensor: k.t, pressureSensor: k.p, humiditySensor: k.h,
      dataloggerModel: s.dl, telemetryUplink: s.ul,
      batteryVoltage: s.bv, lastCalibDate: s.cd, calibCertNo: s.cc,
    },
    baseline: { tempMean: s.bl[0], pressureMean: s.bl[1], humidityMean: s.bl[2], windMean: s.bl[3], windDirMean: s.bl[4] },
    ...(s.status ? { status: s.status } : {}),
  };
}

export const IMD_AWS_STATIONS: IMDStationProfile[] = STATIONS.map(expand);

export const getStationProfile = (id: string): IMDStationProfile =>
  IMD_AWS_STATIONS.find((s) => s.stationId === id) || IMD_AWS_STATIONS[0];

// Re-export open-access live meteorological services directly from stationData
export { fetchLiveStationObservation, fetchBatchLiveObservations } from './liveWeatherService';
export type { LiveObservation } from './liveWeatherService';
export { useLiveStationWeather } from '@/hooks/useLiveStationWeather';
export type { UseLiveStationWeatherResult } from '@/hooks/useLiveStationWeather';
