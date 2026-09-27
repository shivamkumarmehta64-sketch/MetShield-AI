'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Download,
  Gauge,
  Info,
  Radio,
  RefreshCw,
  Sliders,
  Smartphone,
  Thermometer,
  Wind,
  Wrench,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import GuidedTour from './GuidedTour';
import JatayuAssistant from './JatayuAssistant';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useMobileSensors } from '@/hooks/useMobileSensors';
import {
  evaluate3ParamQC,
  QCValidationResult,
  Reading3Param,
} from '@/lib/anomalyDetector';
import {
  insertTelemetry,
  insertEvent,
  generateAuditCsvContent,
  StoredFaultEvent,
  StoredTelemetryPacket,
} from '@/lib/supabaseClient';
import { WebSerialConnector } from '@/components/WebSerialConnector';

interface ChartPoint {
  timeIST: string;
  timestamp: number;
  temperature: number;
  pressure: number;
  humidity: number;
  imputedTemp?: number;
  imputedPress?: number;
  imputedHum?: number;
  isAnomaly?: boolean;
}

interface IncidentRecord {
  id: string;
  stationId: string;
  stationName: string;
  timestamp: string;
  classification: string;
  severity: 'NOMINAL' | 'BLUE_GENUINE_WEATHER' | 'AMBER_PROBE_FREEZE' | 'RED_HARDWARE_FAULT';
  badgeLabel: string;
  badgeColor: 'emerald' | 'blue' | 'amber' | 'rose';
  rawValues: { temp: number; press: number; hum: number };
  imputedValues: { temp: number; press: number; hum: number };
  xai: {
    tempWeight: number;
    pressWeight: number;
    humWeight: number;
    explanation: string;
  };
  recommendedAction: string;
  status: 'PENDING' | 'DISPATCHED' | 'AUTO_CORRECTED';
}

const STATIONS = [
  { id: 'AWS-DEL-01', name: 'New Delhi Safdarjung', state: 'Delhi', baseT: 32.4, baseP: 1008.2, baseRH: 58 },
  { id: 'AWS-MUM-04', name: 'Mumbai Colaba Coastal', state: 'Maharashtra', baseT: 29.8, baseP: 1012.4, baseRH: 82 },
  { id: 'AWS-BLR-07', name: 'Bengaluru GKVK Agro', state: 'Karnataka', baseT: 26.5, baseP: 922.0, baseRH: 64 },
  { id: 'AWS-KOL-02', name: 'Kolkata Alipore Met', state: 'West Bengal', baseT: 33.1, baseP: 1009.6, baseRH: 76 },
  { id: 'AWS-JOD-08', name: 'Jodhpur Arid Zone', state: 'Rajasthan', baseT: 38.6, baseP: 998.4, baseRH: 28 },
];

export function GovInstitutionalConsole({ lang = 'en' }: { lang?: 'en' | 'hi' }) {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [selectedStationIndex, setSelectedStationIndex] = useState<number>(0);
  const currentStation = STATIONS[selectedStationIndex];

  const mobileSensors = useMobileSensors();

  const [ingestionCount, setIngestionCount] = useState<number>(1420);
  const [isDCPActive] = useState<boolean>(true);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>('Just now');

  const [telemetryHistory, setTelemetryHistory] = useState<ChartPoint[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);

  const [showTemp, setShowTemp] = useState<boolean>(true);
  const [showPress, setShowPress] = useState<boolean>(true);
  const [showHum, setShowHum] = useState<boolean>(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [benchInjectionMode, setBenchInjectionMode] = useState<string | null>(null);

  const rawHistoryRef = useRef<Reading3Param[]>([]);

  const getISTTime = useCallback(() => {
    const now = new Date();
    const ist = new Date(now.getTime() + 19800000);
    return ist.toTimeString().split(' ')[0];
  }, []);

  useEffect(() => {
    const initialPoints: ChartPoint[] = [];
    const baseT = currentStation.baseT;
    const baseP = currentStation.baseP;
    const baseRH = currentStation.baseRH;

    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const tTime = now - i * 2500;
      const istString = new Date(tTime + 19800000).toTimeString().split(' ')[0];
      const noiseT = Math.round((Math.sin(i * 0.4) * 0.8 + (Math.random() - 0.5) * 0.4) * 10) / 10;
      const noiseP = Math.round((Math.cos(i * 0.3) * 0.5 + (Math.random() - 0.5) * 0.3) * 10) / 10;
      const noiseRH = Math.round((Math.sin(i * 0.5) * 2 + (Math.random() - 0.5) * 1.5) * 10) / 10;

      const pt: ChartPoint = {
        timeIST: istString,
        timestamp: tTime,
        temperature: Math.round((baseT + noiseT) * 10) / 10,
        pressure: Math.round((baseP + noiseP) * 10) / 10,
        humidity: Math.round((baseRH + noiseRH) * 10) / 10,
      };
      initialPoints.push(pt);
      rawHistoryRef.current.push({
        temperature: pt.temperature,
        pressure: pt.pressure,
        humidity: pt.humidity,
        timestamp: pt.timestamp,
        stationId: currentStation.id,
      });
    }
    // eslint-disable-next-line
    setTelemetryHistory(initialPoints);
  }, [currentStation]);

  useEffect(() => {
    if (!isDCPActive) return;

    const interval = setInterval(() => {
      const timeStr = getISTTime();
      const now = Date.now();
      setLastHeartbeat(timeStr);
      setIngestionCount(prev => prev + 1);

      let nextT: number;
      let nextP: number;
      let nextRH: number;

      if (benchInjectionMode === 'SPIKE_TEMP') {
        nextT = Math.round((currentStation.baseT + 14.2) * 10) / 10;
        nextP = currentStation.baseP + Math.round((Math.random() - 0.5) * 0.2 * 10) / 10;
        nextRH = currentStation.baseRH + Math.round((Math.random() - 0.5) * 0.8 * 10) / 10;
        setBenchInjectionMode(null);
      } else if (benchInjectionMode === 'FREEZE_PROBE') {
        const lastVal = rawHistoryRef.current[rawHistoryRef.current.length - 1];
        nextT = lastVal ? lastVal.temperature : currentStation.baseT;
        nextP = lastVal ? lastVal.pressure : currentStation.baseP;
        nextRH = lastVal ? lastVal.humidity : currentStation.baseRH;
      } else if (benchInjectionMode === 'STORM_CONVECTIVE') {
        nextT = Math.round((currentStation.baseT - 2.8) * 10) / 10;
        nextP = Math.round((currentStation.baseP - 3.4) * 10) / 10;
        nextRH = Math.round((currentStation.baseRH + 18.5) * 10) / 10;
        setBenchInjectionMode(null);
      } else {
        const wanderT = (Math.random() - 0.5) * 0.4;
        const wanderRH = (Math.random() - 0.5) * 1.0;
        nextT = Math.round((currentStation.baseT + wanderT) * 10) / 10;
        nextRH = Math.round((currentStation.baseRH + wanderRH) * 10) / 10;

        if (mobileSensors.isHardwareActive && typeof mobileSensors.pressure === 'number') {
          nextP = mobileSensors.pressure;
        } else {
          const wanderP = (Math.random() - 0.5) * 0.3;
          nextP = Math.round((currentStation.baseP + wanderP) * 10) / 10;
        }
      }

      const currentReading: Reading3Param = {
        temperature: nextT,
        pressure: nextP,
        humidity: nextRH,
        timestamp: now,
        stationId: currentStation.id,
      };

      const qcResult: QCValidationResult = evaluate3ParamQC(currentReading, rawHistoryRef.current);

      rawHistoryRef.current.push(currentReading);
      if (rawHistoryRef.current.length > 40) {
        rawHistoryRef.current = rawHistoryRef.current.slice(-30);
      }

      const newChartPoint: ChartPoint = {
        timeIST: timeStr,
        timestamp: now,
        temperature: qcResult.raw.temperature,
        pressure: qcResult.raw.pressure,
        humidity: qcResult.raw.humidity,
        imputedTemp: qcResult.imputed.wasImputed ? qcResult.imputed.temperature : undefined,
        imputedPress: qcResult.imputed.wasImputed ? qcResult.imputed.pressure : undefined,
        imputedHum: qcResult.imputed.wasImputed ? qcResult.imputed.humidity : undefined,
        isAnomaly: qcResult.severity !== 'NOMINAL',
      };

      setTelemetryHistory(prev => [...prev.slice(-29), newChartPoint]);

      const packetToStore: StoredTelemetryPacket = {
        packetId: `PKT-${currentStation.id}-${now.toString().slice(-6)}`,
        stationId: currentStation.id,
        timestamp: now,
        timeIST: timeStr,
        temperature: qcResult.raw.temperature,
        pressure: qcResult.raw.pressure,
        humidity: qcResult.raw.humidity,
        classification: qcResult.classification,
        alertLevel: qcResult.severity,
        wmoFlag: qcResult.wmoFlag,
        imputedVal: qcResult.imputed.wasImputed ? qcResult.imputed : undefined,
      };
      insertTelemetry(packetToStore);

      if (qcResult.severity !== 'NOMINAL') {
        const eventId = `INC-${Date.now().toString().slice(-6)}`;
        const newIncident: IncidentRecord = {
          id: eventId,
          stationId: currentStation.id,
          stationName: currentStation.name,
          timestamp: timeStr,
          classification: qcResult.classification,
          severity: qcResult.severity,
          badgeLabel: qcResult.alertBadge.label,
          badgeColor: qcResult.alertBadge.color,
          rawValues: {
            temp: qcResult.raw.temperature,
            press: qcResult.raw.pressure,
            hum: qcResult.raw.humidity,
          },
          imputedValues: {
            temp: qcResult.imputed.temperature,
            press: qcResult.imputed.pressure,
            hum: qcResult.imputed.humidity,
          },
          xai: {
            tempWeight: qcResult.xai.tempWeight,
            pressWeight: qcResult.xai.pressWeight,
            humWeight: qcResult.xai.humWeight,
            explanation: qcResult.xai.diagnosticExplanation,
          },
          recommendedAction: qcResult.recommendedAction,
          status: qcResult.severity === 'BLUE_GENUINE_WEATHER' ? 'AUTO_CORRECTED' : 'PENDING',
        };

        setIncidents(prev => [newIncident, ...prev.slice(0, 19)]);

        const faultToStore: StoredFaultEvent = {
          eventId,
          stationId: currentStation.id,
          timestamp: new Date().toISOString(),
          timeIST: timeStr,
          parameter: qcResult.xai.primaryParameter,
          rawVal: qcResult.raw.temperature,
          imputedVal: qcResult.imputed.temperature,
          classification: qcResult.classification,
          severity:
            qcResult.severity === 'BLUE_GENUINE_WEATHER'
              ? 'GENUINE_WEATHER'
              : qcResult.severity === 'RED_HARDWARE_FAULT'
              ? 'CRITICAL'
              : 'WARNING',
          xaiAttribution: {
            tempWeight: qcResult.xai.tempWeight,
            pressWeight: qcResult.xai.pressWeight,
            humWeight: qcResult.xai.humWeight,
            explanation: qcResult.xai.diagnosticExplanation,
          },
          recommendedAction: qcResult.recommendedAction,
        };
        insertEvent(faultToStore);

        if (qcResult.severity === 'RED_HARDWARE_FAULT') {
          mobileSensors.playTelemetryChime(520, 0.15);
        } else if (qcResult.severity === 'BLUE_GENUINE_WEATHER') {
          mobileSensors.playTelemetryChime(880, 0.1);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isDCPActive, benchInjectionMode, currentStation, getISTTime, mobileSensors]);

  const latestTelemetry = useMemo(() => {
    if (telemetryHistory.length === 0) {
      return { temp: currentStation.baseT, press: currentStation.baseP, hum: currentStation.baseRH };
    }
    const last = telemetryHistory[telemetryHistory.length - 1];
    return { temp: last.temperature, press: last.pressure, hum: last.humidity };
  }, [telemetryHistory, currentStation]);

  const handleExportCsv = useCallback(() => {
    const header = [
      '# METSHIELD AI NAWS-QMS v4.2 | TEAM 73869 AEROTECH',
      '# AUTOMATIC WEATHER STATION QUALITY MANAGEMENT SYSTEM',
      `# AUDIT LOG GENERATED AT: ${new Date().toISOString()} (IST)`,
      '# STANDARDS COMPLIANCE: WMO-No. 8 OPEN METEOROLOGICAL PROTOCOL',
      '# =========================================================================',
      'Station_ID,Timestamp_IST,Temp_C,Pres_hPa,RH_pct,WMO_QC_Flag,XAI_Reasoning,Imputed_Value'
    ].join('\n');

    let rows = incidents.map(inc => {
      const wmoFlag = inc.severity === 'BLUE_GENUINE_WEATHER' ? 'FLAG_2_CONVECTIVE_STORM' 
                     : inc.severity === 'RED_HARDWARE_FAULT' ? 'FLAG_4_CORRUPT_HARDWARE'
                     : 'FLAG_3_SUSPECT_DRIFT';
      
      const imputed = inc.imputedValues.temp !== inc.rawValues.temp 
        ? `${inc.imputedValues.temp.toFixed(1)} (Temp)` 
        : inc.imputedValues.press !== inc.rawValues.press 
          ? `${inc.imputedValues.press.toFixed(1)} (Press)` 
          : 'N/A';

      return [
        `"${inc.stationId}"`,
        `"${inc.timestamp}"`,
        inc.rawValues.temp.toFixed(1),
        inc.rawValues.press.toFixed(1),
        inc.rawValues.hum.toFixed(1),
        `"${wmoFlag}"`,
        `"${inc.xai.explanation}"`,
        `"${imputed}"`
      ].join(',');
    });

    if (rows.length === 0) {
      rows.push([
        `"${currentStation.id}"`,
        `"${getISTTime()}"`,
        latestTelemetry.temp.toFixed(1),
        latestTelemetry.press.toFixed(1),
        latestTelemetry.hum.toFixed(1),
        `"FLAG_1_VERIFIED_GOOD"`,
        `"Routine operational audit snapshot. Signals nominal."`,
        `"N/A"`
      ].join(','));
    }

    const csvContent = `${header}\n${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MetShield_AI_AuditReport_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [incidents, currentStation, latestTelemetry, getISTTime]);

  return (
    <div className="w-full space-y-4">
      {/* Top Station & DCP Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b1329]/90 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-sky-400 animate-pulse" />
          <div>
            <span className="text-xs uppercase font-bold text-slate-300">
              {lang === 'en' ? 'Live Telemetry Stream' : 'लाइव टेलीमेट्री स्ट्रीम'}
            </span>
            <span className="text-[11px] text-slate-500 ml-2">INSAT-3DR DCP Link: 2.5s</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Station:</span>
            <select
              aria-label="Select Automatic Weather Station"
              value={selectedStationIndex}
              onChange={e => setSelectedStationIndex(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-xs rounded-md px-2 py-1 text-slate-200 font-medium outline-none"
            >
              {STATIONS.map((st, idx) => (
                <option key={st.id} value={idx}>
                  {st.id} — {st.name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-mono text-sky-400 bg-sky-950/40 px-2 py-1 rounded border border-sky-800/50">
            {ingestionCount.toLocaleString()} Pkts
          </span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5" data-tour="metrics-strip">
        <div className="bg-[#0e1730]/95 border border-slate-800/90 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 rounded-xl p-4 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="space-y-1">
            <span className="text-xs uppercase font-semibold text-slate-400 group-hover:text-slate-300 transition-colors flex items-center gap-1.5">
              {lang === 'en' ? 'Ambient Temperature' : 'तापमान'}
              <span title="Sensor: Class A PT100 RTD | Envelope: -10°C to 55°C">
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 cursor-help" />
              </span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {latestTelemetry.temp.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">°C</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>WMO: -10°C to 55°C</span>
            </div>
            <div className="h-8 w-24 mt-1 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetryHistory}>
                  <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 shadow-sm group-hover:scale-105 transition-transform flex flex-col items-center">
            <Thermometer className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#0e1730]/95 border border-slate-800/90 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/10 rounded-xl p-4 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold text-slate-400 group-hover:text-slate-300 transition-colors flex items-center gap-1.5">
                {lang === 'en' ? 'Atmospheric Pressure' : 'दबाव'}
                <span title="Sensor: Vaisala PTB110 | Envelope: 920 to 1050 hPa">
                  <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 cursor-help" />
                </span>
              </span>
              {mobileSensors.isHardwareActive ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 animate-pulse">
                  ● LIVE MOBILE HARDWARE FEED
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-sky-400 border border-blue-500/30">
                  ● SIMULATED AWS FEED
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {latestTelemetry.press.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">hPa</span>
            </div>
            <div className="text-[11px] text-sky-400 font-medium flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>
                {mobileSensors.isHardwareActive
                  ? `Δh ≈ ${mobileSensors.elevationDeltaMeters > 0 ? '+' : ''}${mobileSensors.elevationDeltaMeters}m`
                  : 'QFE Sea-Level Reduced'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20 shadow-sm group-hover:scale-105 transition-transform">
            <Gauge className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#0e1730]/95 border border-slate-800/90 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 rounded-xl p-4 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="space-y-1">
            <span className="text-xs uppercase font-semibold text-slate-400 group-hover:text-slate-300 transition-colors flex items-center gap-1.5">
              {lang === 'en' ? 'Relative Humidity' : 'आर्द्रता'}
              <span title="Sensor: Humicap Polymer | Envelope: 5% to 100%">
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 cursor-help" />
              </span>
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {latestTelemetry.hum.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">%</span>
            </div>
            <div className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Thermodynamic Coupling</span>
            </div>
            <div className="h-8 w-24 mt-1 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetryHistory}>
                  <Line type="monotone" dataKey="humidity" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20 shadow-sm group-hover:scale-105 transition-transform flex flex-col items-center">
            <CloudRain className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 65/35 Split Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" data-tour="imputation-demo">
        {/* Left 65% Recharts */}
        <div className="lg:col-span-8 bg-[#0e1730]/95 border border-slate-800 rounded-xl p-4 flex flex-col shadow-sm" data-tour="recharts-canvas">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-800/80">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Multi-Parameter Telemetry Curve (2.5s Stream)
              </h3>
              <p className="text-[11px] text-slate-400">
                Station: <span className="text-slate-200 font-mono">{currentStation.id}</span> ({currentStation.name})
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowTemp(t => !t)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  showTemp ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-500'
                }`}
              >
                Temp
              </button>
              <button
                type="button"
                onClick={() => setShowPress(p => !p)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  showPress ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-500'
                }`}
              >
                Pressure
              </button>
              <button
                type="button"
                onClick={() => setShowHum(h => !h)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  showHum ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-500'
                }`}
              >
                Humidity
              </button>
            </div>
          </div>

          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryHistory} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="timeIST" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={11} domain={['auto', 'auto']} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />

                {showTemp && (
                  <>
                    <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                    <Line yAxisId="left" type="monotone" dataKey="imputedTemp" name="Imputed Temp" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  </>
                )}
                {showPress && (
                  <>
                    <Line yAxisId="right" type="monotone" dataKey="pressure" name="Pressure (hPa)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                    <Line yAxisId="right" type="monotone" dataKey="imputedPress" name="Imputed Press" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  </>
                )}
                {showHum && (
                  <>
                    <Line yAxisId="left" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                    <Line yAxisId="left" type="monotone" dataKey="imputedHum" name="Imputed Hum" stroke="#22d3ee" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 35% Real-Time Incident Stream */}
        <div className="lg:col-span-4 bg-[#0e1730]/95 border border-slate-800 rounded-xl p-4 flex flex-col shadow-sm" data-tour="incident-panel">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">Live Incident & Anomaly Stream</h3>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {incidents.length} Events
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-3 max-h-[320px] pr-1">
            {incidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-300">All 20 AWS Stations Nominal</p>
                <p className="text-[11px] text-slate-500 mt-1">Zero physical limit breaches or uncoupled spikes.</p>
              </div>
            ) : (
              incidents.map(inc => {
                const isBlueStorm = inc.severity === 'BLUE_GENUINE_WEATHER';
                const isRedFault = inc.severity === 'RED_HARDWARE_FAULT';
                const borderColor = isBlueStorm ? 'border-blue-500/40 bg-blue-950/20' : isRedFault ? 'border-rose-500/40 bg-rose-950/20' : 'border-amber-500/40 bg-amber-950/20';
                const badgeStyle = isBlueStorm ? 'bg-blue-500/20 text-sky-300 border-blue-500/40' : isRedFault ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                return (
                  <div key={inc.id} className={`p-2.5 rounded-lg border ${borderColor} space-y-1.5 text-xs`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-white font-bold">{inc.stationId} ({inc.timestamp} IST)</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeStyle}`}>{inc.badgeLabel}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">{inc.xai.explanation}</p>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full flex overflow-hidden">
                      <div style={{ width: `${inc.xai.tempWeight}%` }} className="bg-amber-400 h-full" />
                      <div style={{ width: `${inc.xai.pressWeight}%` }} className="bg-sky-400 h-full" />
                      <div style={{ width: `${inc.xai.humWeight}%` }} className="bg-cyan-400 h-full" />
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span className="truncate max-w-[200px]">🔧 {inc.recommendedAction}</span>
                      <span className="text-emerald-400 font-mono">{inc.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Stealth Diagnostic Drawer */}
      <div className="border border-slate-800 bg-[#091124] rounded-xl overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(prev => !prev)}
          className="w-full px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800/90 flex items-center justify-between text-left transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-200">
              [🔧 NIC-MoES Field Diagnostic & Bench Test Tool (Authorized Personnel Only)]
            </span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <span>{isDrawerOpen ? 'Collapse' : 'Expand'}</span>
            {isDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isDrawerOpen && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => setBenchInjectionMode('SPIKE_TEMP')}
              className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/20 hover:bg-rose-900/30 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-rose-300">Simulate Thermistor Open-Circuit</span>
                <Zap className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-[11px] text-slate-400">Injects +14°C step jump without coupling. Triggers Red Alert.</p>
            </button>

            <button
              type="button"
              onClick={() => setBenchInjectionMode('FREEZE_PROBE')}
              className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/30 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-amber-300">Simulate Signal Wire Disconnect / Freeze</span>
                <Sliders className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400">Injects zero-variance cycles (σ &lt; 0.001). Triggers Amber Alert.</p>
            </button>

            <button
              type="button"
              onClick={() => setBenchInjectionMode('STORM_CONVECTIVE')}
              className="p-3 rounded-lg border border-blue-500/40 bg-blue-950/20 hover:bg-blue-900/30 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-sky-300">Trigger Convective Storm Dynamics</span>
                <Wind className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-[11px] text-slate-400">Coupled ΔP ≤ -2.5 hPa + ΔRH ≥ +15%. Triggers Blue Status.</p>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-900/30 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-emerald-300">Export QC Audit Log (.csv)</span>
                <Download className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400">Generates official NIC/IMD metadata header audit report.</p>
            </button>

            <a
              href={`/api/og/certificate?stationId=${currentStation.id}&name=${encodeURIComponent(currentStation.name)}&status=OPTIMAL&temp=${latestTelemetry.temp.toFixed(1)}&press=${latestTelemetry.press.toFixed(1)}&hum=${latestTelemetry.hum.toFixed(0)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg border border-purple-500/40 bg-purple-950/20 hover:bg-purple-900/30 text-left transition-all group block"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-purple-300">Edge Certificate (.png)</span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-[11px] text-slate-400">Generates cryptographic inspection card via Vercel Edge Satori.</p>
            </a>
            
            <div className="col-span-1 sm:col-span-2 lg:col-span-5 mt-2">
              <WebSerialConnector />
            </div>
          </div>
        )}
      </div>
      
      {/* Jatayu AI Assistant */}
      <JatayuAssistant 
        context={{
          station: `${currentStation.id} (${currentStation.name})`,
          telemetry: {
            temp: latestTelemetry.temp,
            press: latestTelemetry.press,
            hum: latestTelemetry.hum,
          }
        }} 
      />
    </div>
  );
}
