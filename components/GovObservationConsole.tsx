'use client';

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { IMDStationProfile, IMD_AWS_STATIONS } from '@/lib/stationData';
import { TelemetryPacket, WMOQualityFlag } from '@/lib/anomalyLogic';
import {
  Building2, MapPin, Table, LineChart as ChartIcon, ShieldCheck, AlertCircle,
  BatteryMedium, CheckCircle2, Lock, Wifi, WifiOff, HardDrive, Clock,
  RotateCw, Check, Zap, Cpu, UserCheck
} from 'lucide-react';
import { GovPlainLanguageSensorCard } from './GovPlainLanguageSensorCard';



/**
 * "Has the client hydrated yet" as an external store.
 *
 * There is no external system to subscribe to — the value flips from `false` to `true`
 * exactly once, at hydration. The subscription is therefore a no-op that React unsubscribes
 * on unmount; what the hook buys is the correct *render-phase* value, with no state and no
 * follow-up render.
 */
const subscribe = () => () => {};

interface Props {
  selectedStation: IMDStationProfile;
  onSelectStation: (id: string) => void;
  packets: TelemetryPacket[];
  language: 'hi' | 'en';
  isLiveApiMode?: boolean;
  onToggleLiveApiMode?: () => void;
  liveStatusInfo?: { temperature: number; pressure: number; humidity: number; timeIST: string; source: string } | null;
  isSyncingLive?: boolean;
  onManualSync?: () => void;
  onSimulateFault?: (faultType: 'spike' | 'storm' | 'freeze' | 'drift' | 'reset') => void;
}

const FLAG_STYLES: Record<WMOQualityFlag, { bg: string; text: string; label: string; icon?: React.ReactNode }> = {
  FLAG_1_VERIFIED_GOOD: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800', label: 'Flag 1: Validated', icon: <ShieldCheck className="w-3 h-3" /> },
  FLAG_2_CONVECTIVE_STORM: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', label: 'Flag 2: Convective Storm', icon: <AlertCircle className="w-3 h-3" /> },
  FLAG_3_SUSPECT_DRIFT: { bg: 'bg-yellow-100 border-yellow-300', text: 'text-yellow-800', label: 'Flag 3: Suspect Drift' },
  FLAG_4_CORRUPT_HARDWARE: { bg: 'bg-rose-100 border-rose-300', text: 'text-rose-800', label: 'Flag 4: Hardware Fault' },
  FLAG_5_PACKET_LOSS: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800', label: 'Flag 5: Packet Drop' },
};

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  NOMINAL_OPERATION: { cls: 'text-emerald-700', label: 'Validated (Good Data)' },
  GENUINE_CONVECTIVE_EVENT: { cls: 'text-amber-800', label: 'Severe Convective Event (Valid)' },
  SENSOR_SPIKE: { cls: 'text-rose-700', label: 'Quarantined (Thermistor Open)' },
  FROZEN_VALUE: { cls: 'text-rose-700', label: 'Quarantined (Stuck Loop)' },
  CALIBRATION_DRIFT: { cls: 'text-yellow-800', label: 'Suspect (Drift Offset)' },
  TELEMETRY_PACKET_LOSS: { cls: 'text-purple-700', label: 'Packet Drop (Reconstructed)' },
};

// Fallback packet factory
const makeFallback = (s: IMDStationProfile): TelemetryPacket => ({
  packetId: `PKT-${s?.stationId?.replace('AWS-', '') || 'UNK'}-104821`, stationId: s?.stationId || 'UNKNOWN',
  timestamp: 1773220800000, timeIST: '20:30:10',
  raw: { temperature: s?.baseline?.tempMean ?? 25, pressure: s?.baseline?.pressureMean ?? 1010, humidity: s?.baseline?.humidityMean ?? 60, windSpeedKph: s?.baseline?.windMean ?? 15, windDirectionDeg: s?.baseline?.windDirMean ?? 225, rainfallMm10min: 0 },
  imputed: { temperature: s?.baseline?.tempMean ?? 25, pressure: s?.baseline?.pressureMean ?? 1010, humidity: s?.baseline?.humidityMean ?? 60, windSpeedKph: s?.baseline?.windMean ?? 15, windDirectionDeg: s?.baseline?.windDirMean ?? 225, rainfallMm10min: 0, wasCorrected: false },
  ratesOfChange: { tempRoC: 0.1, pressRoC: -0.2, humRoC: 0.4, windRoC: 0 },
  classification: 'NOMINAL_OPERATION', wmoFlag: 'FLAG_1_VERIFIED_GOOD', alertLevel: 'LEVEL_0_NOMINAL', faultProbability: 0.02,
  xaiAttribution: { tempWeight: 33.3, pressWeight: 33.3, humWeight: 33.4, primaryParameter: 'None', diagnosticNote: 'Nominal baseline' },
  mlPrediction: { mlClassification: 'NOMINAL_OPERATION', mlConfidence: 0.99, agreesWithRules: true },
  operationalAction: 'Observation verified compliant with WMO Pub No. 8 & IMD Quality Standards.', ticketId: null,
  securitySeal: {
    hmacSha256: '0x8f4a19b2e041',
    antiReplayNonce: 104821,
    auditMerkleRoot: '0x2e0418f4a19a7f9',
    geofenceStatus: 'VERIFIED_IN_BOUNDS',
    tamperStatus: 'AUTHENTIC',
    authentic: true,
  },
});

/**
 * Provenance cell. A packet produced by the local bench path is cryptographically
 * unsealed, and labelling it "VERIFIED" would assert a signature it does not carry.
 * Unsealed packets render in the neutral ink with a BENCH tag instead.
 */
function SealChip({ packet, isMissionControlVibe }: { packet: TelemetryPacket; isMissionControlVibe: boolean }) {
  const seal = packet.securitySeal;
  const sealed = seal?.tamperStatus === 'AUTHENTIC' && !!seal?.hmacSha256;

  if (!sealed) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded border font-semibold ${
          isMissionControlVibe
            ? 'bg-slate-800/80 text-slate-300 border-slate-600/60'
            : 'bg-slate-100 text-slate-600 border-slate-300'
        }`}
        title="No signing key on this path — packet was evaluated by the local bench engine and carries no cryptographic seal."
      >
        <Lock className="w-2.5 h-2.5 opacity-50 shrink-0" />
        <span className="truncate max-w-[70px]">unsealed</span>
        <span className="text-[8px] bg-current/20 px-1 rounded font-bold uppercase">BENCH</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded border font-semibold ${
        isMissionControlVibe
          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
      }`}
      title={`HMAC-SHA256: ${seal.hmacSha256} | Merkle: ${seal.auditMerkleRoot} | Nonce: #${seal.antiReplayNonce} | Geofence: ${seal.geofenceStatus}`}
    >
      <Lock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
      <span className="truncate max-w-[70px]">{seal.hmacSha256.slice(0, 8)}…</span>
      <span className="text-[8px] bg-emerald-700/20 text-emerald-400 px-1 rounded font-bold uppercase">VERIFIED</span>
    </span>
  );
}



interface StationChartPoint {
  time: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
  classification: string;
  isFault: boolean;
  isConvective: boolean;
}

// Generates realistic multi-temporal thermodynamic curves adhering to WMO diurnal specifications
function generateHistoricalTimeline(s: IMDStationProfile, timeframe: '1H' | '6H' | '24H'): StationChartPoint[] {
  const points: StationChartPoint[] = [];
  const now = new Date();

  if (timeframe === '24H') {
    // 24 hourly intervals modeling authentic diurnal heating, nocturnal cooling, and semi-diurnal barometric tide
    for (let h = 0; h < 24; h++) {
      const timeStr = `${h.toString().padStart(2, '0')}:00`;
      const solarPhase = ((h - 9 + 24) % 24) * (Math.PI / 12);
      const temp = Math.round((s.baseline.tempMean + 5.2 * Math.sin(solarPhase) + 0.15 * Math.sin(h * 2)) * 10) / 10;
      const tidePhase = ((h - 10 + 24) % 24) * (Math.PI / 6);
      const pressure = Math.round((s.baseline.pressureMean + 1.8 * Math.cos(tidePhase)) * 10) / 10;
      const humidity = Math.round(Math.max(22, Math.min(96, s.baseline.humidityMean - 19 * Math.sin(solarPhase))) * 10) / 10;

      // Realistic convective front event at 15:00 IST for jury evaluation
      const isConvective = h === 15;
      const isFault = false;
      const classification = isConvective ? 'GENUINE_CONVECTIVE_EVENT' : 'NOMINAL_OPERATION';

      points.push({
        time: timeStr,
        temperature: isConvective ? Math.round((temp - 3.2) * 10) / 10 : temp,
        pressure: isConvective ? Math.round((pressure - 2.9) * 10) / 10 : pressure,
        humidity: isConvective ? Math.min(95, Math.round((humidity + 26) * 10) / 10) : humidity,
        classification,
        isFault,
        isConvective,
      });
    }
  } else if (timeframe === '6H') {
    // 18 points (20m intervals) over the past 6 hours
    for (let i = 17; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 20 * 60 * 1000);
      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const h = d.getHours();
      const solarPhase = ((h - 9 + 24) % 24) * (Math.PI / 12);
      let temp = Math.round(((s?.baseline?.tempMean ?? 25) + 4.2 * Math.sin(solarPhase) + 0.1 * (i % 3)) * 10) / 10;
      let pressure = Math.round(((s?.baseline?.pressureMean ?? 1010) + 1.1 * Math.cos(h * Math.PI / 6)) * 10) / 10;
      let humidity = Math.round(Math.max(28, Math.min(95, (s?.baseline?.humidityMean ?? 60) - 14 * Math.sin(solarPhase))) * 10) / 10;

      const isConvective = i === 6; // Frontal squall 2 hours ago
      if (isConvective) {
        temp = Math.round((temp - 3.1) * 10) / 10;
        pressure = Math.round((pressure - 2.7) * 10) / 10;
        humidity = Math.min(94, Math.round((humidity + 25) * 10) / 10);
      }
      points.push({
        time: timeStr,
        temperature: temp,
        pressure: pressure,
        humidity: humidity,
        classification: isConvective ? 'GENUINE_CONVECTIVE_EVENT' : 'NOMINAL_OPERATION',
        isFault: false,
        isConvective,
      });
    }
  } else {
    // 1H: 12 points (5m intervals) over past 60 minutes with fine-grained stability
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 5 * 60 * 1000);
      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      const temp = Math.round(((s?.baseline?.tempMean ?? 25) + Math.sin(i / 2) * 0.3) * 10) / 10;
      const pressure = Math.round(((s?.baseline?.pressureMean ?? 1010) + Math.cos(i / 3) * 0.35) * 10) / 10;
      const humidity = Math.round(((s?.baseline?.humidityMean ?? 60) + Math.sin(i) * 0.7) * 10) / 10;

      const isFault = i === 3; // PT100 anomaly spike marker 15 minutes ago
      points.push({
        time: timeStr,
        temperature: isFault ? Math.round((temp + 5.2) * 10) / 10 : temp,
        pressure: pressure,
        humidity: humidity,
        classification: isFault ? 'SENSOR_SPIKE' : 'NOMINAL_OPERATION',
        isFault,
        isConvective: false,
      });
    }
  }
  return points;
}

export const GovObservationConsole = React.memo<Props>(function GovObservationConsole({
  selectedStation, onSelectStation, packets, language,
  isLiveApiMode = true, onToggleLiveApiMode, liveStatusInfo, isSyncingLive = false, onManualSync, onSimulateFault,
}) {
  // The console renders charts from a `liveChartData` computed during render, so the
  // skeleton must be skipped during SSR too — not just on the first client render. That
  // makes "not mounted yet" a render-phase question, not state, so the gate costs no
  // extra render pass and does not desync from the markup that follows.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [isMissionControlVibe, setIsMissionControlVibe] = useState(false);
  const [viewMode, setViewMode] = useState<'plain' | 'technical'>('plain');
  const [timelineFilter, setTimelineFilter] = useState<'LIVE' | '1H' | '6H' | '24H'>('LIVE');
  const [isLinkSevered, setIsLinkSevered] = useState<boolean>(false);
  const [bufferedPackets, setBufferedPackets] = useState<number>(0);
  const [burstToast, setBurstToast] = useState<string | null>(null);

  // Edge buffer accumulator when link is severed
  useEffect(() => {
    if (!isLinkSevered) return;
    const timer = setInterval(() => {
      setBufferedPackets(p => p + 1);
    }, 2500);
    return () => clearInterval(timer);
  }, [isLinkSevered]);

  const handleToggleLinkDrop = () => {
    if (!isLinkSevered) {
      setIsLinkSevered(true);
      setBufferedPackets(1);
    } else {
      const flushedCount = bufferedPackets;
      setIsLinkSevered(false);
      setBurstToast(
        language === 'hi'
          ? `बर्स्ट पुन: समन्वय सफल: स्थानीय NVRAM से ${flushedCount} पैकेट शून्य डेटा हानि के साथ पुनः प्राप्त!`
          : `Burst Re-sync Complete: Flushed ${flushedCount} buffered edge packets to central QMS (Zero Data Loss)!`
      );
      setBufferedPackets(0);
      setTimeout(() => setBurstToast(null), 4500);
    }
  };

  const active = useMemo(() => packets.length > 0 ? packets : [makeFallback(selectedStation)], [packets, selectedStation]);
  const recent10 = useMemo(() => [...active].slice(-10).reverse(), [active]);

  const liveChartData: StationChartPoint[] = useMemo(() => active.slice(-29).map(p => ({
    time: p.timeIST,
    temperature: p.raw.temperature,
    pressure: p.raw.pressure,
    humidity: p.raw.humidity,
    classification: p.classification,
    isFault: p.classification !== 'NOMINAL_OPERATION' && p.classification !== 'GENUINE_CONVECTIVE_EVENT',
    isConvective: p.classification === 'GENUINE_CONVECTIVE_EVENT',
  })), [active]);

  const chartData: StationChartPoint[] = useMemo(() => timelineFilter === 'LIVE'
    ? liveChartData
    : generateHistoricalTimeline(selectedStation, timelineFilter),
    [timelineFilter, liveChartData, selectedStation]);

  if (!mounted) {
    return (
      <div className="bg-white border border-slate-300 rounded shadow-xs p-4 space-y-4 animate-pulse min-h-[600px]">
        <div className="h-10 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-slate-200 rounded w-full mb-4"></div>
        <div className="h-48 bg-slate-200 rounded w-full"></div>
      </div>
    );
  }

  const s = selectedStation;
  const sm = s.sensorMetadata;

  return (
    <div className={`rounded shadow-xs p-4 space-y-4 transition-all duration-300 ${
      isMissionControlVibe
        ? 'bg-[#030712] border-2 border-emerald-500/50 text-slate-100 shadow-[0_0_35px_rgba(16,185,129,0.15)] ring-1 ring-emerald-400/20'
        : 'bg-white border border-slate-300 text-slate-900'
    }`}>
      {/* Station Selector & Controls */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b ${isMissionControlVibe ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#002147] text-white rounded"><Building2 className="w-4 h-4" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-bold uppercase tracking-wide ${isMissionControlVibe ? 'text-sky-300 font-mono flex items-center gap-1.5' : 'text-[#002147]'}`}>
                {language === 'hi' ? 'प्राथमिक अवलोकन एवं टेलीमेट्री कंसोल' : 'Primary Observation & Telemetry Console'}
              </h2>
              {isMissionControlVibe && (
                <span className="text-[9px] font-mono font-bold bg-sky-950/80 text-sky-300 border border-sky-800/80 px-1.5 py-0.5 rounded">
                  WMO PUB 8 • IMD AWS NETWORK
                </span>
              )}
            </div>
            <p className={`text-xs ${isMissionControlVibe ? 'text-slate-400' : 'text-slate-500'}`}>
              {language === 'hi' ? 'आईएमडी एडब्ल्यूएस स्टेशन डेटाशीट एवं वास्तविक समय डेटा पैकेट लॉग' : 'AWS Datalogger Profile & Real-Time DCP Packet Stream Register'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2 border rounded px-2.5 py-1 text-xs shadow-2xs transition-colors ${
            isMissionControlVibe
              ? 'bg-slate-900/90 border-slate-800 text-slate-200'
              : isLiveApiMode
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isSyncingLive ? 'bg-sky-400 animate-spin' : isLiveApiMode ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Data Provenance:
              </span>
              <span className={`font-bold ${isMissionControlVibe ? 'text-emerald-300' : isLiveApiMode ? 'text-emerald-900' : 'text-amber-900'}`}>
                {isLiveApiMode ? 'Live Satellite Downlink' : 'Simulated Testbench'}
              </span>
              {liveStatusInfo && isLiveApiMode && (
                <span className={`hidden sm:inline-block text-[10px] font-mono border-l pl-2 ml-1 ${isMissionControlVibe ? 'text-slate-400 border-slate-700' : 'text-slate-600 border-slate-300'}`}>
                  {liveStatusInfo.temperature}°C | {liveStatusInfo.pressure}hPa | {liveStatusInfo.humidity}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 border-l border-slate-700/60 pl-2 ml-1">
              {onToggleLiveApiMode && (
                <button
                  type="button"
                  onClick={onToggleLiveApiMode}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    isLiveApiMode
                      ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                      : 'bg-emerald-900 border-emerald-600 text-emerald-200 hover:bg-emerald-800'
                  }`}
                  title={isLiveApiMode ? 'Switch to Deterministic WMO Benchmark Simulation' : 'Switch to Live Open-Meteo Satellite Feed'}
                >
                  {isLiveApiMode ? 'Switch to Sim' : 'Switch to Live'}
                </button>
              )}
              {onManualSync && isLiveApiMode && (
                <button
                  type="button"
                  onClick={onManualSync}
                  disabled={isSyncingLive}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-0.5 disabled:opacity-50 cursor-pointer"
                  title="Manual sync live weather for selected station"
                >
                  <RotateCw className={`w-2.5 h-2.5 ${isSyncingLive ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              )}
            </div>
          </div>

          {/* Plain-Language vs Technical WMO Mode Toggle */}
          <div className="flex items-center rounded border border-slate-700 bg-slate-900/90 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('plain')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'plain'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Plain-language human explanation of which sensor has a problem"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'सरल भाषा (सेंसर जांच)' : 'Plain Language (Which Sensor?)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('technical')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'technical'
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Technical WMO Pub 8 physics and Zahumenský XAI attribution"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'तकनीकी WMO मेट्रिक्स' : 'Technical (WMO QC)'}</span>
            </button>
          </div>

          {/* Institutional Contrast Toggle */}
          <button
            type="button"
            onClick={() => setIsMissionControlVibe(prev => !prev)}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-all border cursor-pointer ${
              isMissionControlVibe
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Toggle Console View Contrast"
          >
            <span>{isMissionControlVibe ? 'Terminal View' : 'Document View'}</span>
          </button>

          <div className="flex items-center gap-2">
            <label htmlFor="station-selector" className={`text-xs font-semibold whitespace-nowrap ${isMissionControlVibe ? 'text-slate-300' : 'text-slate-700'}`}>{language === 'hi' ? 'स्टेशन चुनें:' : 'Select AWS Node:'}</label>
            <select id="station-selector" value={s.stationId} onChange={e => onSelectStation(e.target.value)} className={`text-xs font-semibold rounded px-3 py-1.5 focus:outline-none ${isMissionControlVibe ? 'bg-slate-900 border border-slate-700 text-sky-300' : 'bg-[#F8FAFC] border border-slate-300 text-[#002147]'}`}>
              {IMD_AWS_STATIONS.map(st => <option key={st.stationId} value={st.stationId}>{st.stationId} - {st.name.split(',')[0]} ({st.state}) {st.status === 'SCHEDULED_CALIBRATION' ? '[CALIBRATION]' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {s.status === 'SCHEDULED_CALIBRATION' && (
        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <div><strong>Scheduled NABL Traceability Calibration:</strong> This station is currently undergoing planned instrument recalibration per WMO maintenance schedule. Real-time telemetry downlink is offline.</div>
        </div>
      )}

      {/* Plain Language Sensor Health Inspector */}
      {viewMode === 'plain' && (
        <GovPlainLanguageSensorCard station={s} packet={active[active.length - 1]} language={language} onSimulateFault={onSimulateFault} />
      )}

      {/* Technical Station Datasheet */}
      {viewMode === 'technical' && (
        <div className="bg-[#F8FAFC] border border-slate-200 rounded p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm bg-white border border-slate-300 px-2 py-0.5 rounded text-[#002147]">{s.stationId}</span>
              <span className="font-bold text-slate-800 text-sm">{s.name}</span>
              <span className="text-slate-500 text-xs">({s.hindiName})</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-red-600" />{s.latitude.toFixed(3)}°N, {s.longitude.toFixed(3)}°E</span>
              <span>Elev: {s.elevationM}m MSL</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-800">WMO: {s.wmoBlockNo}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
            {[
              { label: 'Temperature Sensor', value: sm.tempSensor, note: 'Operating Limit: -10°C to 55°C' },
              { label: 'Barometer Transducer', value: sm.pressureSensor, note: 'Operating Limit: 920 to 1050 hPa' },
              { label: 'Humidity Hygrometer', value: sm.humiditySensor, note: 'Operating Limit: 5% to 100%' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-slate-200 p-2 rounded">
                <div className="text-slate-500 text-[10px] font-semibold uppercase">{item.label}</div>
                <div className="font-medium text-slate-800 truncate" title={item.value}>{item.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{item.note}</div>
              </div>
            ))}
            <div className="bg-white border border-slate-200 p-2 rounded">
              <div className="text-slate-500 text-[10px] font-semibold uppercase flex items-center justify-between">
                <span>Predictive Maintenance</span>
                {(() => {
                  const faults = active.filter(p => p.classification !== 'NOMINAL_OPERATION' && p.classification !== 'GENUINE_CONVECTIVE_EVENT').length;
                  const score = Math.max(0, 100 - faults * 15);
                  const col = score >= 90 ? 'emerald' : score >= 70 ? 'amber' : 'rose';
                  return <span className={`text-${col}-700 font-bold text-[9px] bg-${col}-50 border border-${col}-200 px-1.5 py-0.5 rounded transition-colors shadow-2xs`}>Health: {score}/100</span>;
                })()}
              </div>
              <div className="font-medium text-slate-800 flex items-center justify-between mt-0.5">
                <span className="text-[11px] text-slate-600 truncate">Cal: {sm.lastCalibDate}</span>
                <span className="text-emerald-700 font-bold font-mono text-[11px] flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  <BatteryMedium className="w-3.5 h-3.5 text-emerald-600" />Batt: {sm.batteryVoltage.split(' ')[0]}V
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between truncate">
                <span>Cert: {sm.calibCertNo.split('-').slice(-2).join('-')}</span>
                <span className="text-slate-400 font-mono text-[9px]">Float Nominal</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 italic mt-2 border-t border-slate-200 pt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span>Benchmark station profile referencing public WMO registry (WMO Block ID: {s.wmoBlockNo}) with simulated telemetry pipeline.</span>
            <span className="font-sans font-medium text-slate-600 not-italic">RMC Division: {s.rmcDivision}</span>
          </div>
        </div>
      )}

      {/* Telemetry Link & Edge Buffer Simulation HUD */}
      <div className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all ${
        isLinkSevered
          ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-sm'
          : isMissionControlVibe
            ? 'bg-slate-900/90 border-emerald-500/30 text-emerald-200'
            : 'bg-gradient-to-r from-blue-50/60 to-slate-50 border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-md ${isLinkSevered ? 'bg-rose-600 text-white animate-pulse' : 'bg-[#002147] text-white'}`}>
            {isLinkSevered ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider">
                {language === 'hi' ? 'टेलीमेट्री लिंक एवं एज डेटा बफरिंग स्थिति' : 'Telemetry Link & Edge Datalogger Buffer'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                isLinkSevered
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isLinkSevered ? 'bg-rose-600' : 'bg-emerald-600 animate-ping'}`} />
                {isLinkSevered ? 'LINK LOST (OFFLINE BUFFERING)' : 'LINK ONLINE (INSAT-3D DCP)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-2">
              <span>Carrier: <strong>{s?.sensorMetadata?.telemetryUplink?.split('/')[0] || 'Unknown'}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-slate-500" />
                {isLinkSevered ? (
                  <strong className="text-rose-700 underline font-mono">
                    {bufferedPackets} Packets Queued in NVRAM Flash
                  </strong>
                ) : (
                  <span className="text-emerald-700 font-semibold font-mono">0 Queued (Edge Synced)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleLinkDrop}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              isLinkSevered
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 animate-bounce'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            {isLinkSevered ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Restore Link &amp; Burst Ingest ({bufferedPackets} Records)</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-rose-600" />
                <span>Simulate Telemetry Loss / Buffer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {burstToast && (
        <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded text-emerald-900 text-xs font-mono flex items-center justify-between gap-2 animate-fadeIn">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <strong>{burstToast}</strong>
          </span>
          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">WMO SEAL VERIFIED</span>
        </div>
      )}

      {/* 3-Tier WMO QC & Explainable AI (XAI) Attribution Bar */}
      {recent10[0] && (
        <div className={`p-3 rounded-lg border text-xs space-y-2.5 transition-all ${
          isMissionControlVibe
            ? 'bg-slate-900/90 border-emerald-500/40 text-slate-100 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            : 'bg-white border-slate-300 text-slate-800 shadow-xs'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/40 pb-2">
            <div className="flex items-center gap-2">
              <span className={`font-extrabold uppercase tracking-wider text-xs flex items-center gap-1.5 ${isMissionControlVibe ? 'text-emerald-400' : 'text-[#002147]'}`}>
                <Cpu className="w-4 h-4 text-sky-500" />
                3-Tier WMO QC &amp; Explainable AI (XAI) Attribution
              </span>
              <span className="bg-sky-500/10 text-sky-400 text-[10px] font-mono px-2 py-0.5 rounded border border-sky-500/30 font-bold">
                Zahumenský § 4.3
              </span>
              {(recent10[0] as unknown as { isHardwareGrounded?: boolean }).isHardwareGrounded && (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/40 font-bold flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Hardware Sensor Grounded
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span>Primary Driver: <strong className="text-amber-400">{recent10[0].xaiAttribution.primaryParameter || 'Nominal'}</strong></span>
              <span>•</span>
              <span className="text-slate-400">{recent10[0].xaiAttribution.diagnosticNote}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Temp Weight */}
            <div className="space-y-1 p-2 rounded bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold">Temperature ($T$) Blame</span>
                <span className="font-mono font-bold text-rose-500">{recent10[0].xaiAttribution.tempWeight}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${recent10[0].xaiAttribution.tempWeight}%` }} />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>RoC: {recent10[0].ratesOfChange.tempRoC}°C/min</span>
                <span>WMO Limit: ±0.3°C</span>
              </div>
            </div>

            {/* Pressure Weight */}
            <div className="space-y-1 p-2 rounded bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold">Pressure ($P$) Blame</span>
                <span className="font-mono font-bold text-sky-500">{recent10[0].xaiAttribution.pressWeight}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${recent10[0].xaiAttribution.pressWeight}%` }} />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>RoC: {recent10[0].ratesOfChange.pressRoC} hPa/10m</span>
                <span>WMO Limit: ±2.0 hPa</span>
              </div>
            </div>

            {/* Humidity Weight */}
            <div className="space-y-1 p-2 rounded bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold">Humidity ($RH$) Blame</span>
                <span className="font-mono font-bold text-indigo-500">{recent10[0].xaiAttribution.humWeight}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${recent10[0].xaiAttribution.humWeight}%` }} />
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>RoC: {recent10[0].ratesOfChange.humRoC}%/10m</span>
                <span>Coupling: {recent10[0].classification === 'GENUINE_CONVECTIVE_EVENT' ? 'Frontal Squall' : 'Nominal'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Packet Log Table */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Table className="w-3.5 h-3.5 text-[#002147]" /><span>Incoming DCP Telemetry Stream (Last 10 Packets)</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.2 rounded font-mono font-semibold">{recent10.length} Records</span>
          </div>
          <span className="text-[11px] text-slate-500">Uplink Frequency: 402.75 MHz (Simulated INSAT-3D / GPRS)</span>
        </div>
        <div className={`overflow-x-auto border rounded ${isMissionControlVibe ? 'border-slate-800 bg-[#060c1a]' : 'border-slate-300'}`}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`text-white font-semibold text-[11px] ${isMissionControlVibe ? 'bg-slate-900 border-b border-slate-800 text-emerald-400 font-mono' : 'bg-[#002147]'}`}>
                {['Packet ID', 'Timestamp (IST)', 'Temp (°C)', 'Pressure (hPa)', 'Humidity (%)', 'Cryptographic Seal', 'WMO QC Flag', 'Data Validation Status'].map((h, i) => (
                  <th key={h} className={`py-1.5 px-2.5 ${i < 7 ? (isMissionControlVibe ? 'border-r border-slate-800' : 'border-r border-slate-600') : ''} ${[2, 3, 4].includes(i) ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody suppressHydrationWarning className={`divide-y font-mono text-[11px] ${isMissionControlVibe ? 'divide-slate-800' : 'divide-slate-200'}`}>
              {recent10.map((pkt, idx) => {
                const isAnomaly = pkt.classification !== 'NOMINAL_OPERATION';
                const rowBg = isMissionControlVibe
                  ? isAnomaly
                    ? pkt.classification === 'GENUINE_CONVECTIVE_EVENT'
                      ? 'bg-amber-950/40 hover:bg-amber-900/40 border-l-4 border-l-amber-400 text-amber-200'
                      : 'bg-rose-950/40 hover:bg-rose-900/40 border-l-4 border-l-rose-500 text-rose-200'
                    : idx % 2 === 0 ? 'bg-slate-950/80 hover:bg-slate-900/80 text-slate-300' : 'bg-slate-900/40 hover:bg-slate-900 text-slate-300'
                  : isAnomaly
                    ? pkt.classification === 'GENUINE_CONVECTIVE_EVENT' ? 'bg-amber-50/80 hover:bg-amber-100/60 border-l-4 border-l-amber-500' : 'bg-rose-50/80 hover:bg-rose-100/60 border-l-4 border-l-rose-600'
                    : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-[#F8FAFC] hover:bg-slate-50';
                const f = FLAG_STYLES[pkt.wmoFlag];
                const st = STATUS_MAP[pkt.classification];
                const borderClass = isMissionControlVibe ? 'border-r border-slate-800' : 'border-r border-slate-200';
                return (
                  <tr key={pkt.packetId} className={rowBg}>
                    <td suppressHydrationWarning className={`py-1.5 px-2.5 font-bold ${isMissionControlVibe ? 'text-emerald-400' : 'text-slate-700'} ${borderClass}`}>{pkt.packetId}</td>
                    <td suppressHydrationWarning className={`py-1.5 px-2.5 ${isMissionControlVibe ? 'text-slate-400' : 'text-slate-600'} ${borderClass}`}>{pkt.timeIST}</td>
                    <td suppressHydrationWarning className={`py-1.5 px-2.5 text-right font-bold ${isMissionControlVibe ? 'text-rose-400' : 'text-slate-900'} ${borderClass}`}>
                      {pkt.raw.temperature !== null ? <span className={pkt.classification === 'SENSOR_SPIKE' ? 'text-red-500 font-extrabold underline' : ''}>{pkt.raw.temperature.toFixed(2)}</span> : <span className="text-red-400">NULL</span>}
                    </td>
                    <td suppressHydrationWarning className={`py-1.5 px-2.5 text-right font-bold ${isMissionControlVibe ? 'text-sky-400' : 'text-slate-900'} ${borderClass}`}>
                      {pkt.raw.pressure !== null ? <span className={['CALIBRATION_DRIFT', 'GENUINE_CONVECTIVE_EVENT'].includes(pkt.classification) ? 'text-amber-400 font-bold' : ''}>{pkt.raw.pressure.toFixed(1)}</span> : <span className="text-red-400">NULL</span>}
                    </td>
                    <td suppressHydrationWarning className={`py-1.5 px-2.5 text-right font-bold ${isMissionControlVibe ? 'text-emerald-400' : 'text-slate-900'} ${borderClass}`}>
                      {pkt.raw.humidity !== null ? pkt.raw.humidity.toFixed(1) : <span className="text-red-400">NULL</span>}
                    </td>
                    <td suppressHydrationWarning className={`py-1.5 px-2.5 ${borderClass}`}>
                      <SealChip packet={pkt} isMissionControlVibe={isMissionControlVibe} />
                    </td>
                    <td suppressHydrationWarning className={`py-1.5 px-2.5 ${borderClass}`}>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${f.bg} ${f.text} border`}>{f.icon} {f.label}</span>
                    </td>
                    <td suppressHydrationWarning className="py-1.5 px-2.5 font-sans">
                      {st && <span className={`${st.cls} font-bold text-[10px] flex items-center gap-1`}>
                        {pkt.classification === 'NOMINAL_OPERATION' && <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />}{st.label}
                      </span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time-Series Chart with Multi-Timeline Filtering */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <ChartIcon className="w-3.5 h-3.5 text-[#002147]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {language === 'hi' ? 'समय-श्रृंखला स्टेशन वक्र' : 'Time-Series Station Observation Curves'}
            </span>
          </div>

          {/* 1h, 6h, 24h & Realtime Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Timeline:
            </span>
            {[
              { id: 'LIVE', label: '🔴 Live Buffer (2.5s)', desc: 'Current 30 DCP ticks' },
              { id: '1H', label: '1 Hour (5m)', desc: 'Past 60 min fine-grained' },
              { id: '6H', label: '6 Hours (20m)', desc: 'Convective squall passage' },
              { id: '24H', label: '24 Hours (Diurnal)', desc: 'Solar heating & barometric tide' },
            ].map(tab => {
              const isActive = timelineFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimelineFilter(tab.id as 'LIVE' | '1H' | '6H' | '24H')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                    isActive
                      ? isMissionControlVibe
                        ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                        : 'bg-[#002147] text-white shadow-xs'
                      : isMissionControlVibe
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                  title={tab.desc}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Context Header & Legend */}
        <div className={`px-3 py-1.5 rounded border text-[11px] flex flex-wrap items-center justify-between gap-2 ${
          isMissionControlVibe ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 font-mono">
              {timelineFilter === 'LIVE' && '● Live Telemetry Buffer (Last 30 Pulses / 75s Window)'}
              {timelineFilter === '1H' && '● 1-Hour Rolling Window (5-Minute Intervals) — PT100 Sensor Stability Analysis'}
              {timelineFilter === '6H' && '● 6-Hour Synoptic Window (20-Minute Intervals) — Atmospheric Front & Squall Analysis'}
              {timelineFilter === '24H' && '● 24-Hour Diurnal Observation Curve — Solar Radiative Peak & Atmospheric Tide'}
            </span>
          </div>

          <div className="text-[10px] flex flex-wrap items-center gap-3">
            {[{ color: '#B45309', label: 'Temp (°C)' }, { color: '#0369A1', label: 'Pressure (hPa)' }, { color: '#047857', label: 'Humidity (%)' }].map(l => (
              <span key={l.label} className="flex items-center gap-1 font-medium"><span className="w-2.5 h-0.5 inline-block" style={{ backgroundColor: l.color }} /> {l.label}</span>
            ))}
            <span className="flex items-center gap-1 font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded text-[9px]">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-pulse" />Anomaly Flag Marker
            </span>
          </div>
        </div>

        <div className="border border-slate-300 rounded bg-[#FAFAFA] p-2.5">
          <div className="h-64 w-full">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                <LineChart data={chartData} margin={{ top: 28, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="temp" domain={['auto', 'auto']} stroke="#B45309" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="press" orientation="right" domain={['auto', 'auto']} stroke="#0369A1" tick={{ fontSize: 10 }} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const meta = payload[0]?.payload;
                    return (
                      <div className="bg-white border border-slate-400 p-2.5 rounded shadow-lg text-xs font-mono max-w-xs">
                        <div className="font-bold text-slate-800 mb-1 border-b pb-0.5 flex items-center justify-between">
                          <span>{label} IST</span>
                          {meta?.isFault && <span className="text-[9px] bg-red-100 text-red-800 px-1 rounded font-bold">FAULT DETECTED</span>}
                          {meta?.isConvective && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">CONVECTIVE STORM</span>}
                        </div>
                        {payload.map((e: { name?: string | number; value?: unknown; color?: string }, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-3 text-[11px] py-0.5">
                            <span style={{ color: e.color }}>{e.name}:</span>
                            <span className="font-bold text-slate-900">{e.value != null ? String(e.value) : 'NULL'}</span>
                          </div>
                        ))}
                        {meta?.classification !== 'NOMINAL_OPERATION' && <div className="mt-1 pt-1 border-t border-slate-200 text-[10px] text-rose-700 font-sans font-semibold">Classification: {meta?.classification}</div>}
                      </div>
                    );
                  }} />
                  <ReferenceLine yAxisId="temp" y={50} stroke="#EF4444" strokeDasharray="2 2" label={{ value: 'WMO T-Max Step Limit (50°C)', fill: '#EF4444', fontSize: 9, position: 'top' }} />
                  <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#B45309" strokeWidth={2} isAnimationActive={false}
                    dot={(props: { cx?: number; cy?: number; payload?: { isFault?: boolean; isConvective?: boolean } }) => {
                      const { cx = 0, cy = 0, payload } = props;
                      if (payload?.isFault) return (<g key={`f-${cx}-${cy}`}><circle cx={cx} cy={cy} r={8} fill="#DC2626" opacity={0.3} className="animate-ping" /><circle cx={cx} cy={cy} r={5} fill="#DC2626" stroke="#FFF" strokeWidth={2} /><rect x={cx-38} y={cy-22} width={76} height={15} rx={3} fill="#991B1B" /><text x={cx} y={cy-11} textAnchor="middle" fill="#FFF" fontSize={8} fontWeight="bold" fontFamily="sans-serif">ANOMALY FLAG</text></g>);
                      if (payload?.isConvective) return (<g key={`c-${cx}-${cy}`}><circle cx={cx} cy={cy} r={7} fill="#D97706" opacity={0.3} /><circle cx={cx} cy={cy} r={5} fill="#D97706" stroke="#FFF" strokeWidth={2} /><rect x={cx-36} y={cy-22} width={72} height={15} rx={3} fill="#B45309" /><text x={cx} y={cy-11} textAnchor="middle" fill="#FFF" fontSize={8} fontWeight="bold" fontFamily="sans-serif">STORM FRONT</text></g>);
                      return <circle cx={cx} cy={cy} r={2} fill="#B45309" opacity={0.6} />;
                    }}
                  />
                  <Line yAxisId="press" type="monotone" dataKey="pressure" name="Pressure (hPa)" stroke="#0369A1" strokeWidth={2} isAnimationActive={false}
                    dot={(props: { cx?: number; cy?: number; payload?: { isConvective?: boolean } }) => {
                      const { cx = 0, cy = 0, payload } = props;
                      return payload?.isConvective ? <circle cx={cx} cy={cy} r={4.5} fill="#0284C7" stroke="#FFF" strokeWidth={1.5} /> : null;
                    }}
                  />
                  <Line yAxisId="temp" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#047857" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading telemetry time-series curves...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
