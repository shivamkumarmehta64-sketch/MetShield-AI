'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  CheckCircle2,
  Download,
  Flame,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sliders,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import { useMobileSensors } from '@/hooks/useMobileSensors';
import {
  evaluate3ParamQC,
  type Reading3Param,
  type QCValidationResult,
  WMO_LIMITS,
} from '@/lib/anomalyDetector';
import {
  insertTelemetry,
  insertEvent,
  getAuditLogRecords,
  generateAuditCsvContent,
  type StoredFaultEvent,
  type StoredTelemetryPacket,
} from '@/lib/supabaseClient';

interface ChartPoint {
  index: number;
  timeStr: string;
  temperature: number;
  pressure: number;
  humidity: number;
  imputedTemp?: number;
  imputedPres?: number;
  imputedHum?: number;
  wmoFlag: string;
  severity: string;
  isAnomaly: boolean;
}

interface IncidentItem {
  id: string;
  stationId: string;
  timestampIST: string;
  timestampUTC: string;
  classification: string;
  severity: 'NOMINAL' | 'BLUE_GENUINE_WEATHER' | 'AMBER_PROBE_FREEZE' | 'AMBER_CALIBRATION_DRIFT' | 'RED_HARDWARE_FAULT';
  wmoFlag: string;
  badgeLabel: string;
  badgeColor: 'emerald' | 'blue' | 'amber' | 'rose';
  raw: { temperature: number; pressure: number; humidity: number };
  imputed: { temperature: number; pressure: number; humidity: number };
  deltas: { deltaT: number; deltaP: number; deltaRH: number };
  xai: {
    tempWeight: number;
    pressWeight: number;
    humWeight: number;
    primaryParameter: string;
    diagnosticExplanation: string;
  };
  recommendedAction: string;
}

type SimulatedScenario = 'nominal' | 'temp-spike' | 'probe-freeze' | 'convective-storm';

function generateInitialBaseline(): {
  initialPoints: ChartPoint[];
  initialReadings: Reading3Param[];
  initialQC: QCValidationResult;
} {
  const baseEpoch = 1759320000000;
  const initialPoints: ChartPoint[] = [];
  const initialReadings: Reading3Param[] = [];

  const baseT = 31.4;
  const baseP = 1008.2;
  const baseRH = 64.5;

  for (let i = 12; i >= 0; i--) {
    const ts = baseEpoch - i * 2500;
    const t = Math.round((baseT + (Math.sin(i * 0.4) * 0.6)) * 10) / 10;
    const p = Math.round((baseP + (Math.cos(i * 0.3) * 0.4)) * 10) / 10;
    const rh = Math.round((baseRH - (Math.sin(i * 0.4) * 1.2)) * 10) / 10;
    const timeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(ts));

    const reading: Reading3Param = {
      temperature: t,
      pressure: p,
      humidity: rh,
      timestamp: ts,
      stationId: 'AWS-DEL-04',
    };
    initialReadings.push(reading);

    initialPoints.push({
      index: 13 - i,
      timeStr,
      temperature: t,
      pressure: p,
      humidity: rh,
      wmoFlag: 'FLAG_1_GOOD',
      severity: 'NOMINAL',
      isAnomaly: false,
    });
  }

  const initialQC = evaluate3ParamQC(
    initialReadings[initialReadings.length - 1],
    initialReadings.slice(0, -1)
  );

  return { initialPoints, initialReadings, initialQC };
}

const BASELINE = generateInitialBaseline();

export default function RealTimeQCCanvas() {
  // ── Hardware Web Sensors Hook ──────────────────────────────────────────────
  const { pressure: hardwarePressure, isHardwareActive } = useMobileSensors();

  // ── Accessibility & Bilingual Controls ────────────────────────────────────
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  // ── Layer Toggles ──────────────────────────────────────────────────────────
  const [showTemp, setShowTemp] = useState<boolean>(true);
  const [showPres, setShowPres] = useState<boolean>(true);
  const [showHum, setShowHum] = useState<boolean>(true);

  // ── Simulation Scenario State ──────────────────────────────────────────────
  const [activeScenario, setActiveScenario] = useState<SimulatedScenario>('nominal');
  const scenarioStepRef = useRef<number>(0);

  // ── Telemetry & Ring Buffer State ─────────────────────────────────────────
  const [packetCount, setPacketCount] = useState<number>(14);
  const [dcpStatus, setDcpStatus] = useState<'SYNCED' | 'INGESTING'>('SYNCED');
  const [chartData, setChartData] = useState<ChartPoint[]>(BASELINE.initialPoints);
  const [currentResult, setCurrentResult] = useState<QCValidationResult | null>(BASELINE.initialQC);
  const [incidentList, setIncidentList] = useState<IncidentItem[]>([]);

  // ── Internal Historical Buffer for Rate-of-Change ──────────────────────────
  const historyRef = useRef<Reading3Param[]>(BASELINE.initialReadings);
  const freezeBufferRef = useRef<number[]>([]);

  // ── DCP Satellite Link Cadence Loop (2.5s) ─────────────────────────────────
  const processNextTick = useCallback(() => {
    setDcpStatus('INGESTING');
    setTimeout(() => setDcpStatus('SYNCED'), 400);

    const now = Date.now();
    const prevHistory = historyRef.current;
    const prevReading = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1] : null;

    let nextT = 31.4 + (Math.random() - 0.5) * 0.4;
    let nextP = isHardwareActive && hardwarePressure ? hardwarePressure : (1008.2 + (Math.random() - 0.5) * 0.3);
    let nextRH = 64.5 + (Math.random() - 0.5) * 0.8;

    // Apply active scenario mutations
    if (activeScenario === 'temp-spike') {
      // Thermistor Open-Circuit Spike (Sudden +24°C step jump)
      nextT = 55.4;
      nextP = prevReading ? prevReading.pressure + (Math.random() - 0.5) * 0.1 : 1008.2;
      nextRH = prevReading ? prevReading.humidity + (Math.random() - 0.5) * 0.2 : 64.5;
    } else if (activeScenario === 'probe-freeze') {
      // Probe Float Lock (Exact zero variance for 6+ cycles)
      scenarioStepRef.current += 1;
      const freezeVal = freezeBufferRef.current[0] ?? 31.8;
      if (freezeBufferRef.current.length === 0) {
        freezeBufferRef.current = [freezeVal];
      }
      nextT = freezeVal;
      nextP = prevReading ? prevReading.pressure : 1008.2;
      nextRH = prevReading ? prevReading.humidity : 64.5;
    } else if (activeScenario === 'convective-storm') {
      // Convective Front Dynamics (Coupled plunge: ΔP <= -2.5 hPa & ΔRH >= +15% & ΔT <= -0.5°C)
      const prevP = prevReading?.pressure ?? 1008.2;
      const prevRH = prevReading?.humidity ?? 64.5;
      const prevT = prevReading?.temperature ?? 31.4;

      nextP = Math.round((prevP - 3.8) * 10) / 10;
      nextRH = Math.min(99.0, Math.round((prevRH + 22.0) * 10) / 10);
      nextT = Math.round((prevT - 2.1) * 10) / 10;
    }

    nextT = Math.round(nextT * 10) / 10;
    nextP = Math.round(nextP * 10) / 10;
    nextRH = Math.round(nextRH * 10) / 10;

    const currentReading: Reading3Param = {
      temperature: nextT,
      pressure: nextP,
      humidity: nextRH,
      timestamp: now,
      stationId: 'AWS-DEL-04',
    };

    // Evaluate 3-tier QC engine
    const qc = evaluate3ParamQC(currentReading, prevHistory);
    setCurrentResult(qc);

    // Update history window (keep last 30 frames)
    const updatedHistory = [...prevHistory, currentReading].slice(-30);
    historyRef.current = updatedHistory;

    const timeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(now));

    const timeUTC = new Date(now).toISOString();

    const newPoint: ChartPoint = {
      index: updatedHistory.length,
      timeStr,
      temperature: qc.raw.temperature,
      pressure: qc.raw.pressure,
      humidity: qc.raw.humidity,
      imputedTemp: qc.imputed.wasImputed ? qc.imputed.temperature : undefined,
      imputedPres: qc.imputed.wasImputed ? qc.imputed.pressure : undefined,
      imputedHum: qc.imputed.wasImputed ? qc.imputed.humidity : undefined,
      wmoFlag: qc.wmoFlag,
      severity: qc.severity,
      isAnomaly: qc.severity !== 'NOMINAL',
    };

    setChartData((prev) => [...prev, newPoint].slice(-30));
    setPacketCount((c) => c + 1);

    // Persist into memory buffer / Supabase
    const telemetryPacket: StoredTelemetryPacket = {
      packetId: `PKT-${now}`,
      stationId: 'AWS-DEL-04',
      timestamp: now,
      timeIST: timeStr,
      temperature: qc.raw.temperature,
      pressure: qc.raw.pressure,
      humidity: qc.raw.humidity,
      classification: qc.classification,
      alertLevel: qc.severity,
      wmoFlag: qc.wmoFlag,
      imputedVal: qc.imputed.wasImputed ? qc.imputed : undefined,
    };
    insertTelemetry(telemetryPacket);

    // If an event occurs, push to real-time incident stream & fault event store
    if (qc.severity !== 'NOMINAL') {
      const faultEvent: StoredFaultEvent = {
        eventId: `EVT-${now}`,
        stationId: 'AWS-DEL-04',
        timestamp: timeUTC,
        timeIST: timeStr,
        parameter: qc.xai.primaryParameter !== 'none' ? qc.xai.primaryParameter : 'multivariate',
        rawVal:
          qc.xai.primaryParameter === 'temperature'
            ? qc.raw.temperature
            : qc.xai.primaryParameter === 'pressure'
            ? qc.raw.pressure
            : qc.raw.humidity,
        imputedVal:
          qc.xai.primaryParameter === 'temperature'
            ? qc.imputed.temperature
            : qc.xai.primaryParameter === 'pressure'
            ? qc.imputed.pressure
            : qc.imputed.humidity,
        temperatureC: qc.raw.temperature,
        pres_hPa: qc.raw.pressure,
        rh_pct: qc.raw.humidity,
        classification: qc.classification,
        severity:
          qc.severity === 'RED_HARDWARE_FAULT'
            ? 'CRITICAL'
            : qc.severity === 'BLUE_GENUINE_WEATHER'
            ? 'GENUINE_WEATHER'
            : 'WARNING',
        xaiAttribution: {
          tempWeight: qc.xai.tempWeight,
          pressWeight: qc.xai.pressWeight,
          humWeight: qc.xai.humWeight,
          explanation: qc.xai.diagnosticExplanation,
        },
        recommendedAction: qc.recommendedAction,
      };
      insertEvent(faultEvent);

      const incidentEntry: IncidentItem = {
        id: faultEvent.eventId,
        stationId: 'AWS-DEL-04',
        timestampIST: timeStr,
        timestampUTC: timeUTC.slice(11, 19),
        classification: qc.classification,
        severity: qc.severity,
        wmoFlag: qc.wmoFlag,
        badgeLabel: qc.alertBadge.label,
        badgeColor: qc.alertBadge.color,
        raw: qc.raw,
        imputed: qc.imputed,
        deltas: qc.deltas,
        xai: qc.xai,
        recommendedAction: qc.recommendedAction,
      };

      setIncidentList((prev) => [incidentEntry, ...prev.slice(0, 19)]);
    }
  }, [activeScenario, hardwarePressure, isHardwareActive]);

  useEffect(() => {
    const timer = setInterval(processNextTick, 2500);
    return () => clearInterval(timer);
  }, [processNextTick]);

  // ── Diagnostic Scenario Injections ─────────────────────────────────────────
  const triggerScenario = (scenario: SimulatedScenario) => {
    setActiveScenario(scenario);
    scenarioStepRef.current = 0;
    freezeBufferRef.current = [];
    if (scenario !== 'nominal') {
      // Immediately run next tick for prompt UX responsiveness
      setTimeout(processNextTick, 50);
    }
  };

  // ── Official Audit Log CSV Export ──────────────────────────────────────────
  const handleExportAuditCsv = () => {
    let records = getAuditLogRecords();
    if (records.length === 0) {
      // Seed with current or default incident
      const timeIST = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());

      const fallbackRecord: StoredFaultEvent = {
        eventId: 'EVT-INIT-04',
        stationId: 'AWS-DEL-04',
        timestamp: new Date().toISOString(),
        timeIST,
        parameter: 'temperature',
        rawVal: currentResult?.raw.temperature ?? 31.4,
        imputedVal: currentResult?.imputed.temperature ?? 31.4,
        temperatureC: currentResult?.raw.temperature ?? 31.4,
        pres_hPa: currentResult?.raw.pressure ?? 1008.2,
        rh_pct: currentResult?.raw.humidity ?? 64.5,
        classification: currentResult?.classification ?? 'NOMINAL_OPERATION',
        severity: 'INFO',
        xaiAttribution: {
          tempWeight: currentResult?.xai.tempWeight ?? 33,
          pressWeight: currentResult?.xai.pressWeight ?? 34,
          humWeight: currentResult?.xai.humWeight ?? 33,
          explanation: currentResult?.xai.diagnosticExplanation ?? 'Nominal multi-sensor cross correlation.',
        },
        recommendedAction: currentResult?.recommendedAction ?? 'Continuous ingestion into NWP model.',
      };
      records = [fallbackRecord];
    }

    const csvContent = generateAuditCsvContent(records);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NIC_MoES_QC_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // ── Font Size Scale Styles ────────────────────────────────────────────────
  const rootScaleClass =
    fontSize === 'sm' ? 'text-[13px]' : fontSize === 'lg' ? 'text-[15px]' : 'text-[14px]';

  const tRaw = currentResult?.raw.temperature ?? 31.4;
  const pRaw = currentResult?.raw.pressure ?? 1008.2;
  const rhRaw = currentResult?.raw.humidity ?? 64.5;

  const tCorrected = currentResult?.imputed.wasImputed && currentResult.imputed.temperature !== tRaw;
  const pCorrected = currentResult?.imputed.wasImputed && currentResult.imputed.pressure !== pRaw;
  const rhCorrected = currentResult?.imputed.wasImputed && currentResult.imputed.humidity !== rhRaw;

  return (
    <div
      className={`min-h-screen flex flex-col font-sans bg-[var(--color-page)] text-[var(--color-ink)] ${rootScaleClass}`}
    >
      {/* ── 1. Tricolor Institutional Strip (2px) ─────────────────────────── */}
      <div className="flex w-full h-[2.5px] shrink-0" aria-hidden="true">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white border-y border-hairline/40" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* ── 2. Official Institutional Header Bar (GIGW Compliant) ─────────── */}
      <header className="sticky top-0 z-40 bg-[var(--color-card)] border-b border-[var(--color-hairline)] shadow-xs">
        <div
          className="mx-auto flex items-center justify-between gap-4 px-4 sm:px-6"
          style={{ maxWidth: 1540, height: 60 }}
        >
          {/* Emblem & Titles */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xs bg-navy flex items-center justify-center shrink-0 shadow-xs">
              <Shield className="w-4 h-4 text-sky-deep" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold tracking-tight text-navy text-[15px]">
                  METSHIELD AI — NAWS-QMS v4.2
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface-alt border border-hairline text-ink-muted">
                  WMO-No. 8 PROTOCOL
                </span>
              </div>
              <div className="text-[11px] text-ink-muted font-medium truncate">
                {lang === 'hi' ? 'प्रोटोटाइप | पृथ्वी विज्ञान मंत्रालय (MoES/IMD) समस्या विवरण SIH26073 | Team AEROTECH1' : 'Prototype for MoES/IMD Problem Statement SIH26073 | Team AEROTECH1'}
              </div>
            </div>
          </div>

          {/* Center Ingestion Link Status */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-alt border border-hairline text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                dcpStatus === 'INGESTING' ? 'bg-sky-deep animate-ping' : 'bg-healthy'
              }`}
            />
            <span className="text-ink font-semibold">DCP SATELLITE LINK: ACTIVE (2.5s)</span>
            <span className="text-ink-faint">|</span>
            <span className="text-ink-muted">NODE: AWS-DEL-04</span>
            <span className="text-ink-faint">|</span>
            <span className="text-navy font-bold">{packetCount} PACKETS INGESTED</span>
          </div>

          {/* Right Controls: GIGW Accessibility & Nav */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Font scaling */}
            <div
              className="flex items-center border border-hairline rounded bg-card overflow-hidden text-[11px] font-mono"
              role="group"
              aria-label="Text size"
            >
              <button
                type="button"
                onClick={() => setFontSize('sm')}
                className={`px-2 py-1 hover:bg-surface-hover ${
                  fontSize === 'sm' ? 'bg-surface-alt font-bold text-navy' : 'text-ink-muted'
                }`}
                title="Small text"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize('md')}
                className={`px-2 py-1 border-x border-hairline hover:bg-surface-hover ${
                  fontSize === 'md' ? 'bg-surface-alt font-bold text-navy' : 'text-ink-muted'
                }`}
                title="Default text"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('lg')}
                className={`px-2 py-1 hover:bg-surface-hover ${
                  fontSize === 'lg' ? 'bg-surface-alt font-bold text-navy' : 'text-ink-muted'
                }`}
                title="Large text"
              >
                A+
              </button>
            </div>

            {/* Bilingual toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="px-2.5 py-1 text-[11px] font-bold border border-hairline rounded bg-card text-navy hover:bg-surface-alt"
              title="Bilingual Switch"
            >
              {lang === 'en' ? 'हिन्दी' : 'English'}
            </button>

            {/* Navigation links */}
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded bg-navy text-white hover:bg-navy-deep shadow-xs transition-colors"
            >
              <span>Console</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Canvas Content Container ─────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full px-4 sm:px-6 py-5 flex flex-col gap-5" style={{ maxWidth: 1540 }}>
        {/* ── 3. Hero Telemetry Strip (3 Metric Cards) ──────────────────────── */}
        <section aria-label="Hero Telemetry Strip" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Temperature (°C) */}
          <div className="card p-4 flex flex-col justify-between border-l-4 border-l-[var(--color-met-temperature)]">
            <div className="flex items-center justify-between gap-2">
              <span className="t-label text-ink-muted flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[var(--color-met-temperature)]" />
                {lang === 'hi' ? 'शुष्क बल्ब तापमान' : 'DRY-BULB TEMPERATURE'}
              </span>
              <span className="t-meta font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-alt text-ink">
                WMO: -10°C to 55°C
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`t-mono text-[34px] font-extrabold leading-none ${
                  tRaw < WMO_LIMITS.TEMP_MIN || tRaw > WMO_LIMITS.TEMP_MAX
                    ? 'text-fault'
                    : 'text-ink'
                }`}
              >
                {tRaw.toFixed(1)}
              </span>
              <span className="text-[16px] font-bold text-ink-muted">°C</span>
              {tCorrected && (
                <span className="text-[11px] font-mono text-warning font-semibold ml-auto">
                  Auto-Imputed: {currentResult?.imputed.temperature.toFixed(1)}°C
                </span>
              )}
            </div>
            <div className="mt-2 text-[11px] text-ink-muted flex items-center justify-between">
              <span>Station: AWS-DEL-04 (Safdarjung)</span>
              <span className="text-healthy font-semibold">● SENSOR NOMINAL</span>
            </div>
          </div>

          {/* Card 2: Atmospheric Pressure (hPa) with Mobile Hardware Badge */}
          <div className="card p-4 flex flex-col justify-between border-l-4 border-l-[var(--color-met-pressure)]">
            <div className="flex items-center justify-between gap-2">
              <span className="t-label text-ink-muted flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[var(--color-met-pressure)]" />
                {lang === 'hi' ? 'वायुमंडलीय दबाव' : 'ATMOSPHERIC PRESSURE'}
              </span>
              {/* Badge: Live Mobile Hardware Feed vs Simulated AWS Feed */}
              <span
                className={`t-meta font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 text-[10px] ${
                  isHardwareActive
                    ? 'bg-healthy-bg text-healthy-text border border-healthy-border animate-pulse'
                    : 'bg-surface-alt text-navy border border-hairline'
                }`}
              >
                {isHardwareActive ? '● LIVE MOBILE HARDWARE FEED' : '● SIMULATED AWS FEED'}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="t-mono text-[34px] font-extrabold leading-none text-ink">
                {pRaw.toFixed(1)}
              </span>
              <span className="text-[16px] font-bold text-ink-muted">hPa</span>
              {pCorrected && (
                <span className="text-[11px] font-mono text-warning font-semibold ml-auto">
                  Auto-Imputed: {currentResult?.imputed.pressure.toFixed(1)} hPa
                </span>
              )}
            </div>
            <div className="mt-2 text-[11px] text-ink-muted flex items-center justify-between">
              <span>Altimetry: ~8.4m elevation / 1 hPa</span>
              <span className="font-mono text-ink-faint">Reduced QNH</span>
            </div>
          </div>

          {/* Card 3: Relative Humidity (%) */}
          <div className="card p-4 flex flex-col justify-between border-l-4 border-l-[var(--color-met-humidity)]">
            <div className="flex items-center justify-between gap-2">
              <span className="t-label text-ink-muted flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-[var(--color-met-humidity)]" />
                {lang === 'hi' ? 'सापेक्षिक आर्द्रता' : 'RELATIVE HUMIDITY'}
              </span>
              <span className="t-meta font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-alt text-ink">
                Range: 5% to 100%
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="t-mono text-[34px] font-extrabold leading-none text-ink">
                {rhRaw.toFixed(1)}
              </span>
              <span className="text-[16px] font-bold text-ink-muted">%</span>
              {rhCorrected && (
                <span className="text-[11px] font-mono text-warning font-semibold ml-auto">
                  Auto-Imputed: {currentResult?.imputed.humidity.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mt-2 text-[11px] text-ink-muted flex items-center justify-between">
              <span>Coupled Threshold: ΔRH ≥ +15%</span>
              <span className="text-healthy font-semibold">● DEW POINT NOMINAL</span>
            </div>
          </div>
        </section>

        {/* ── 4. Main Split Grid (65% / 35%) ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-5 items-start">
          {/* Left Canvas (65%): Unified Recharts Time-Series Container */}
          <section
            aria-label="Unified Telemetry Curves"
            className="card overflow-hidden flex flex-col bg-card"
          >
            {/* Header & Layer Toggles */}
            <div className="p-4 border-b border-hairline flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="t-card-title text-navy font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-deep" />
                  {lang === 'hi' ? 'वास्तविक समय बहु-पैरामीटर टेलीमेट्री' : 'REAL-TIME MULTIVARIATE TELEMETRY STREAM'}
                </h2>
                <p className="t-meta mt-0.5">
                  2.5s DCP cycle cadence · 30-frame sliding window · WMO-No. 8 physical limits
                </p>
              </div>

              {/* Interactive Layer Toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowTemp(!showTemp)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                    showTemp
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-card text-ink-muted border-hairline opacity-60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--color-met-temperature)]" />
                  Temp (°C)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPres(!showPres)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                    showPres
                      ? 'bg-purple-50 text-purple-900 border-purple-300'
                      : 'bg-card text-ink-muted border-hairline opacity-60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--color-met-pressure)]" />
                  Pressure (hPa)
                </button>
                <button
                  type="button"
                  onClick={() => setShowHum(!showHum)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                    showHum
                      ? 'bg-cyan-50 text-cyan-900 border-cyan-300'
                      : 'bg-card text-ink-muted border-hairline opacity-60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--color-met-humidity)]" />
                  Humidity (%)
                </button>
              </div>
            </div>

            {/* Recharts Canvas */}
            <div className="p-4" style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="3 3" opacity={0.6} />
                  <XAxis
                    dataKey="timeStr"
                    tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
                    tickMargin={6}
                  />
                  {/* Axis 1: Temperature */}
                  <YAxis
                    yAxisId="yTemp"
                    domain={['dataMin - 3', 'dataMax + 3']}
                    orientation="left"
                    tick={{ fontSize: 10, fill: 'var(--color-met-temperature)' }}
                    width={36}
                    hide={!showTemp}
                  />
                  {/* Axis 2: Pressure */}
                  <YAxis
                    yAxisId="yPres"
                    domain={['dataMin - 2', 'dataMax + 2']}
                    orientation="right"
                    tick={{ fontSize: 10, fill: 'var(--color-met-pressure)' }}
                    width={48}
                    hide={!showPres}
                  />
                  {/* Axis 3: Humidity */}
                  <YAxis
                    yAxisId="yHum"
                    domain={[0, 100]}
                    orientation="right"
                    tick={{ fontSize: 10, fill: 'var(--color-met-humidity)' }}
                    width={36}
                    hide={!showHum}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-hairline)',
                      borderRadius: 6,
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />

                  {/* Reference line for nominal baseline */}
                  <ReferenceLine
                    yAxisId="yTemp"
                    y={55.0}
                    stroke="var(--color-fault)"
                    strokeDasharray="4 4"
                    label={{ value: 'WMO Max 55°C', fill: 'var(--color-fault)', fontSize: 10 }}
                  />

                  {/* Temperature Curve */}
                  {showTemp && (
                    <Line
                      yAxisId="yTemp"
                      type="monotone"
                      dataKey="temperature"
                      name="Temp (°C)"
                      stroke="var(--color-met-temperature)"
                      strokeWidth={2.2}
                      dot={(props) => {
                        const pt = chartData[props.index];
                        if (pt?.severity === 'RED_HARDWARE_FAULT') {
                          return (
                            <circle
                              key={`dot-${props.index}`}
                              cx={props.cx}
                              cy={props.cy}
                              r={5}
                              fill="var(--color-fault)"
                              stroke="#fff"
                              strokeWidth={1.5}
                            />
                          );
                        }
                        if (pt?.severity === 'BLUE_GENUINE_WEATHER') {
                          return (
                            <circle
                              key={`dot-${props.index}`}
                              cx={props.cx}
                              cy={props.cy}
                              r={5}
                              fill="var(--color-weather)"
                              stroke="#fff"
                              strokeWidth={1.5}
                            />
                          );
                        }
                        return <circle key={`dot-${props.index}`} cx={props.cx} cy={props.cy} r={2} fill="var(--color-met-temperature)" />;
                      }}
                    />
                  )}

                  {/* Pressure Curve */}
                  {showPres && (
                    <Line
                      yAxisId="yPres"
                      type="monotone"
                      dataKey="pressure"
                      name="Pressure (hPa)"
                      stroke="var(--color-met-pressure)"
                      strokeWidth={2.2}
                      dot={{ r: 2 }}
                    />
                  )}

                  {/* Humidity Curve */}
                  {showHum && (
                    <Line
                      yAxisId="yHum"
                      type="monotone"
                      dataKey="humidity"
                      name="Humidity (%)"
                      stroke="var(--color-met-humidity)"
                      strokeWidth={2.2}
                      dot={{ r: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Status Ticker */}
            <div className="px-4 py-2.5 bg-surface-alt border-t border-hairline flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-muted">
                {currentResult?.alertBadge.description ?? 'System nominal. Multi-sensor cross-correlation within limits.'}
              </span>
              <span className="font-bold text-navy">
                TIER {currentResult?.tierPassed ?? 3} PASSED · WMO FLAG: {currentResult?.wmoFlag ?? 'FLAG_1_GOOD'}
              </span>
            </div>
          </section>

          {/* Right Canvas (35%): Real-Time Incident Stream */}
          <section
            aria-label="Real-Time Incident Stream"
            className="card overflow-hidden flex flex-col bg-card"
          >
            <div className="p-4 border-b border-hairline flex items-center justify-between">
              <div>
                <h2 className="t-card-title text-navy font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-fault" />
                  {lang === 'hi' ? 'वास्तविक समय घटना स्ट्रीम' : 'REAL-TIME INCIDENT STREAM'}
                </h2>
                <p className="t-meta">Root-cause identification & SHAP XAI attribution</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-alt text-ink">
                {incidentList.length} INCIDENTS
              </span>
            </div>

            {/* Incident Cards List */}
            <div className="p-3 flex flex-col gap-3 overflow-y-auto max-h-[480px]">
              {incidentList.length === 0 ? (
                <div className="p-6 text-center text-ink-muted flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-healthy stroke-[1.5]" />
                  <p className="t-body font-medium">Zero Quarantined Anomalies</p>
                  <p className="text-[11px] text-ink-faint">
                    All telemetry packets currently comply with WMO-No. 8 physical & thermodynamic envelopes.
                  </p>
                </div>
              ) : (
                incidentList.map((inc) => (
                  <div
                    key={inc.id}
                    className={`p-3.5 rounded border transition-all ${
                      inc.severity === 'RED_HARDWARE_FAULT'
                        ? 'border-fault-border bg-fault-bg/40'
                        : inc.severity === 'BLUE_GENUINE_WEATHER'
                        ? 'border-weather-border bg-weather-bg/40'
                        : 'border-warning-border bg-warning-bg/40'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-ink">
                        <span>{inc.stationId}</span>
                        <span className="text-ink-faint">·</span>
                        <span className="text-ink-muted">{inc.timestampIST} IST</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          inc.severity === 'RED_HARDWARE_FAULT'
                            ? 'bg-fault text-white'
                            : inc.severity === 'BLUE_GENUINE_WEATHER'
                            ? 'bg-weather text-white'
                            : 'bg-warning text-white'
                        }`}
                      >
                        {inc.badgeLabel}
                      </span>
                    </div>

                    {/* Diagnostic Explanation */}
                    <p className="text-[11px] text-ink font-medium mt-2 leading-relaxed">
                      {inc.xai.diagnosticExplanation}
                    </p>

                    {/* SHAP / XAI Attribution Bars */}
                    <div className="mt-2.5 pt-2 border-t border-hairline/60">
                      <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted mb-1">
                        <span>XAI ATTRIBUTION (SHAP WEIGHTS)</span>
                        <span>PRIMARY: {inc.xai.primaryParameter.toUpperCase()}</span>
                      </div>
                      {/* Attribution Progress Bar */}
                      <div className="w-full h-2 rounded-full overflow-hidden flex bg-surface-alt border border-hairline">
                        <div
                          style={{ width: `${inc.xai.tempWeight}%` }}
                          className="bg-[var(--color-met-temperature)] h-full"
                          title={`Temperature: ${inc.xai.tempWeight}%`}
                        />
                        <div
                          style={{ width: `${inc.xai.pressWeight}%` }}
                          className="bg-[var(--color-met-pressure)] h-full"
                          title={`Pressure: ${inc.xai.pressWeight}%`}
                        />
                        <div
                          style={{ width: `${inc.xai.humWeight}%` }}
                          className="bg-[var(--color-met-humidity)] h-full"
                          title={`Humidity: ${inc.xai.humWeight}%`}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-ink-faint mt-1">
                        <span>Temp: {inc.xai.tempWeight}%</span>
                        <span>Pres: {inc.xai.pressWeight}%</span>
                        <span>Hum: {inc.xai.humWeight}%</span>
                      </div>
                    </div>

                    {/* Operational Action */}
                    <div className="mt-2.5 p-2 rounded bg-card/80 border border-hairline text-[11px]">
                      <span className="font-bold text-navy block text-[10px]">OPERATIONAL ACTION:</span>
                      <span className="text-ink-muted">{inc.recommendedAction}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* ── 5. Stealth Diagnostic Drawer (Authorized Personnel Only) ──────── */}
        <details className="card overflow-hidden group border border-hairline bg-card shadow-xs mt-2">
          <summary className="p-3.5 border-b border-hairline bg-surface-alt font-mono text-[12px] font-bold text-navy hover:text-ink cursor-pointer flex justify-between items-center select-none">
            <span className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-navy-deep" />
              [🔧 Field Diagnostic & Bench Test Tool (Authorized Personnel Only)]
            </span>
            <span className="text-[11px] text-ink-muted group-open:hidden">
              Click to expand test controls & export
            </span>
          </summary>

          <div className="p-5 flex flex-col gap-5 bg-card">
            {/* Fault Scenario Injections */}
            <div>
              <div className="t-label text-ink-muted mb-2.5 text-[11px] flex items-center gap-1.5 font-bold">
                <Sliders className="w-3.5 h-3.5 text-navy" />
                SIMULATE HARDWARE FAULT & WEATHER ANOMALIES
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => triggerScenario('nominal')}
                  className={`px-3.5 py-2 text-[12px] font-mono font-semibold border rounded transition-all flex items-center gap-1.5 ${
                    activeScenario === 'nominal'
                      ? 'bg-healthy text-white border-healthy-border shadow-xs'
                      : 'bg-card text-ink border-hairline hover:bg-surface-hover'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Network (Nominal)
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('temp-spike')}
                  className={`px-3.5 py-2 text-[12px] font-mono font-semibold border rounded transition-all flex items-center gap-1.5 ${
                    activeScenario === 'temp-spike'
                      ? 'bg-fault text-white border-fault-border shadow-xs'
                      : 'bg-card text-fault-text border-hairline hover:bg-fault-bg'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Simulate Thermistor Open-Circuit
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('probe-freeze')}
                  className={`px-3.5 py-2 text-[12px] font-mono font-semibold border rounded transition-all flex items-center gap-1.5 ${
                    activeScenario === 'probe-freeze'
                      ? 'bg-warning text-white border-warning-border shadow-xs'
                      : 'bg-card text-warning-text border-hairline hover:bg-warning-bg'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  Simulate Probe Float Lock
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('convective-storm')}
                  className={`px-3.5 py-2 text-[12px] font-mono font-semibold border rounded transition-all flex items-center gap-1.5 ${
                    activeScenario === 'convective-storm'
                      ? 'bg-weather text-white border-weather-border shadow-xs'
                      : 'bg-card text-weather-text border-hairline hover:bg-weather-bg'
                  }`}
                >
                  <Wind className="w-3.5 h-3.5" />
                  Simulate Convective Front Dynamics
                </button>
              </div>
            </div>

            {/* Compliance Audit Log CSV Exporter */}
            <div className="border-t border-hairline pt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="t-label text-ink-muted text-[11px] font-bold">
                  OFFICIAL METEOROLOGICAL AUDIT EXPORT
                </div>
                <p className="t-meta text-[11px] text-ink-muted mt-0.5">
                  Compliant with WMO-No. 8 & NIC/IMD standards. Includes formula injection sanitization.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="px-4 py-2 text-[12px] font-mono font-bold border border-navy rounded bg-navy text-white hover:bg-navy-deep flex items-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                Export QC Audit Log (.csv)
              </button>
            </div>
          </div>
        </details>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-hairline bg-card py-3 px-4 sm:px-6 text-[11px] text-ink-muted font-mono flex flex-wrap justify-between items-center gap-2">
        <div>
          <span>METSHIELD AI — NAWS-QMS v4.2</span>
          <span className="mx-2 text-ink-faint">|</span>
          <span>MoES / IMD, Government of India</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/audit-report" className="hover:text-ink underline">
            Documentation
          </Link>
          <Link href="/mobile" className="hover:text-ink underline">
            Mobile Field Node
          </Link>
          <Link href="/dashboard" className="hover:text-ink underline font-bold text-navy">
            Operations Console →
          </Link>
        </div>
      </footer>
    </div>
  );
}
