'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
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
  CheckCircle2,
  ChevronRight,
  Download,
  Droplets,
  Gauge,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sliders,
  Thermometer,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import { useMobileSensors } from '@/hooks/useMobileSensors';
import ThemeToggle from '@/components/ThemeToggle';
import { IMD_AWS_STATIONS, getStationProfile } from '@/lib/stationData';
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

  // ── Selected IMD Station (21-station registry) ─────────────────────────────
  const [selectedStationId, setSelectedStationId] = useState<string>('AWS-DEL-04');
  const selectedStation = getStationProfile(selectedStationId) ?? IMD_AWS_STATIONS[0];
  const selectedStationIdRef = useRef<string>('AWS-DEL-04');

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
  const [chartData, setChartData] = useState<ChartPoint[]>(BASELINE.initialPoints);
  const [currentResult, setCurrentResult] = useState<QCValidationResult | null>(BASELINE.initialQC);
  const [incidentList, setIncidentList] = useState<IncidentItem[]>([]);

  // ── Live Weather Feed State (Open-Meteo / IMD Gateway) ────────────────────
  const [liveProvider, setLiveProvider] = useState<string | null>(null);
  const liveFeedRef = useRef<{
    temperature: number;
    pressure: number;
    humidity: number;
    provider: string;
    fetchedAt: number;
  } | null>(null);
  const lastApiHistoryStampRef = useRef<number>(0);

  // ── Internal Historical Buffer for Rate-of-Change ──────────────────────────
  const historyRef = useRef<Reading3Param[]>(BASELINE.initialReadings);
  const freezeBufferRef = useRef<number[]>([]);
  const packetCountRef = useRef<number>(14);
  const activeScenarioRef = useRef<SimulatedScenario>(activeScenario);
  const hardwareRef = useRef({ pressure: hardwarePressure, isHardwareActive });

  useEffect(() => {
    activeScenarioRef.current = activeScenario;
  }, [activeScenario]);

  useEffect(() => {
    hardwareRef.current = { pressure: hardwarePressure, isHardwareActive };
  }, [hardwarePressure, isHardwareActive]);

  useEffect(() => {
    selectedStationIdRef.current = selectedStationId;
  }, [selectedStationId]);

  // Fetch real live meteorological readings for the selected station on mount/change + every 30s
  useEffect(() => {
    let cancelled = false;
    const station = getStationProfile(selectedStationId) ?? IMD_AWS_STATIONS[0];
    liveFeedRef.current = null;
    lastApiHistoryStampRef.current = 0;

    const syncLiveWeather = async () => {
      try {
        const res = await fetch(
          `/api/weather?stationId=${encodeURIComponent(station.stationId)}&lat=${station.latitude}&lon=${station.longitude}`
        );
        if (!res.ok) return;
        const payload = (await res.json()) as {
          success?: boolean;
          provider?: string;
          data?: {
            temperature?: number;
            pressure?: number;
            humidity?: number;
            timestamp?: number;
          };
        };
        if (cancelled || !payload?.success || !payload.data) return;
        const t = Number(payload.data.temperature);
        const p = Number(payload.data.pressure);
        const rh = Number(payload.data.humidity);
        if (!Number.isFinite(t) || !Number.isFinite(p) || !Number.isFinite(rh)) return;

        const isFirstSync = liveFeedRef.current === null;
        const fetchedAt = payload.data.timestamp ?? Date.now();
        liveFeedRef.current = {
          temperature: Math.round(t * 10) / 10,
          pressure: Math.round(p * 10) / 10,
          humidity: Math.round(rh * 10) / 10,
          provider: payload.provider ?? 'OPEN_METEO',
          fetchedAt,
        };
        setLiveProvider(payload.provider ?? 'OPEN_METEO');

        // On first live load while nominal, re-anchor the baseline window to the real
        // observation so transitioning from SSR seed to live weather never fires a false spike.
        if (isFirstSync && activeScenarioRef.current === 'nominal') {
          const liveTs = Date.now();
          const liveReading: Reading3Param = {
            temperature: liveFeedRef.current.temperature,
            pressure: liveFeedRef.current.pressure,
            humidity: liveFeedRef.current.humidity,
            timestamp: liveTs,
            stationId: station.stationId,
          };
          historyRef.current = [liveReading];
          lastApiHistoryStampRef.current = fetchedAt;
          const qc = evaluate3ParamQC(liveReading, []);
          setCurrentResult(qc);
          const timeStr = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }).format(new Date(liveTs));
          setChartData([
            {
              index: packetCountRef.current,
              timeStr,
              temperature: qc.raw.temperature,
              pressure: qc.raw.pressure,
              humidity: qc.raw.humidity,
              wmoFlag: qc.wmoFlag,
              severity: qc.severity,
              isAnomaly: false,
            },
          ]);
        }
      } catch {
        // Keep simulated fallback cleanly when offline
      }
    };

    void syncLiveWeather();
    const timer = setInterval(() => void syncLiveWeather(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedStationId]);

  // ── Local Evaluation Cadence Loop (2.5s) ─────────────────────────────────
  const processNextTick = useCallback(() => {
    const now = Date.now();
    const prevHistory = historyRef.current;
    const prevReading = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1] : null;
    const scenario = activeScenarioRef.current;
    const hw = hardwareRef.current;
    const live = liveFeedRef.current;

    let nextT = live ? live.temperature : 31.4 + (Math.random() - 0.5) * 0.4;
    let nextP =
      hw.isHardwareActive && hw.pressure
        ? hw.pressure
        : live
        ? live.pressure
        : 1008.2 + (Math.random() - 0.5) * 0.3;
    let nextRH = live ? live.humidity : 64.5 + (Math.random() - 0.5) * 0.8;

    // Apply active scenario mutations
    if (scenario === 'temp-spike') {
      // Thermistor Open-Circuit Spike: chatter > 10°C per cycle within WMO envelope
      // so consecutive ticks remain SENSOR_SPIKE instead of reverting to NOMINAL or PROBE_FREEZE.
      const step = scenarioStepRef.current;
      scenarioStepRef.current += 1;
      nextT = (step % 2 === 0 ? 52.8 : 41.6) + (Math.random() - 0.5) * 0.4;
      nextP = prevReading ? prevReading.pressure + (Math.random() - 0.5) * 0.1 : 1008.2;
      nextRH = prevReading ? prevReading.humidity + (Math.random() - 0.5) * 0.2 : 64.5;
    } else if (scenario === 'probe-freeze') {
      // Probe Float Lock (Exact zero variance for 6+ cycles)
      scenarioStepRef.current += 1;
      const freezeVal = freezeBufferRef.current[0] ?? 31.8;
      if (freezeBufferRef.current.length === 0) {
        freezeBufferRef.current = [freezeVal];
      }
      nextT = freezeVal;
      nextP = prevReading ? prevReading.pressure : 1008.2;
      nextRH = prevReading ? prevReading.humidity : 64.5;
    } else if (scenario === 'convective-storm') {
      // Convective Front Dynamics: coupled plunge on front passage (step 0),
      // then stabilize in the post-frontal air mass instead of saturating RH and faulting on step 1.
      const step = scenarioStepRef.current;
      scenarioStepRef.current += 1;
      const prevP = prevReading?.pressure ?? 1008.2;
      const prevRH = prevReading?.humidity ?? 64.5;
      const prevT = prevReading?.temperature ?? 31.4;

      if (step === 0) {
        nextP = Math.round((prevP - 3.8) * 10) / 10;
        nextRH = Math.min(99.0, Math.round((prevRH + 22.0) * 10) / 10);
        nextT = Math.round((prevT - 2.1) * 10) / 10;
      } else {
        nextP = prevP + (Math.random() - 0.5) * 0.2;
        nextRH = Math.min(99.0, Math.max(75.0, prevRH + (Math.random() - 0.5) * 0.6));
        nextT = prevT + (Math.random() - 0.5) * 0.3;
      }
    }

    nextT = Math.round(nextT * 10) / 10;
    nextP = Math.round(nextP * 10) / 10;
    nextRH = Math.round(nextRH * 10) / 10;

    const activeStationId = selectedStationIdRef.current;
    const currentReading: Reading3Param = {
      temperature: nextT,
      pressure: nextP,
      humidity: nextRH,
      timestamp: now,
      stationId: activeStationId,
    };

    // Evaluate 3-tier QC engine.
    // When streaming exact 30s-cached Open-Meteo API values in nominal mode without
    // a physical barometer, only advance the QC history window when a new API sample
    // arrives so cached API values are not misclassified as a frozen 2.5s hardware probe.
    const isPolledLiveNominal =
      scenario === 'nominal' && live !== null && !hw.isHardwareActive;
    const isNewApiSample = live !== null && live.fetchedAt !== lastApiHistoryStampRef.current;

    const qc = evaluate3ParamQC(currentReading, prevHistory);
    setCurrentResult(qc);

    if (!isPolledLiveNominal || isNewApiSample) {
      if (live && isNewApiSample) {
        lastApiHistoryStampRef.current = live.fetchedAt;
      }
      const updatedHistory = [...prevHistory, currentReading].slice(-30);
      historyRef.current = updatedHistory;
    }

    const timeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(now));

    const timeUTC = new Date(now).toISOString();

    const nextCount = packetCountRef.current + 1;
    packetCountRef.current = nextCount;

    const newPoint: ChartPoint = {
      index: nextCount,
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
    setPacketCount(nextCount);

    // Persist into memory buffer / Supabase
    const telemetryPacket: StoredTelemetryPacket = {
      packetId: `PKT-${now}`,
      stationId: activeStationId,
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
        stationId: activeStationId,
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
  }, []);

  useEffect(() => {
    const timer = setInterval(processNextTick, 2500);
    return () => clearInterval(timer);
  }, [processNextTick]);

  // ── Diagnostic Scenario Injections ─────────────────────────────────────────
  const triggerScenario = (scenario: SimulatedScenario) => {
    activeScenarioRef.current = scenario;
    setActiveScenario(scenario);
    scenarioStepRef.current = 0;
    freezeBufferRef.current = [];
    if (scenario === 'nominal' && liveFeedRef.current) {
      const live = liveFeedRef.current;
      const liveTs = Date.now();
      historyRef.current = [
        {
          temperature: live.temperature,
          pressure: live.pressure,
          humidity: live.humidity,
          timestamp: liveTs,
          stationId: selectedStationIdRef.current,
        },
      ];
      lastApiHistoryStampRef.current = live.fetchedAt;
    }
    setTimeout(processNextTick, 50);
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

  // ── Font Size Scale Styles (rem-based for OS/browser zoom compatibility) ──
  const rootScaleClass =
    fontSize === 'sm' ? 'text-[0.8125rem]' : fontSize === 'lg' ? 'text-[0.9375rem]' : 'text-[0.875rem]';

  const tRaw = currentResult?.raw.temperature ?? 31.4;
  const pRaw = currentResult?.raw.pressure ?? 1008.2;
  const rhRaw = currentResult?.raw.humidity ?? 64.5;

  const tCorrected = currentResult?.imputed.wasImputed && currentResult.imputed.temperature !== tRaw;
  const pCorrected = currentResult?.imputed.wasImputed && currentResult.imputed.pressure !== pRaw;
  const rhCorrected = currentResult?.imputed.wasImputed && currentResult.imputed.humidity !== rhRaw;

  const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <MotionConfig reducedMotion="user">
    <div
      className={`min-h-screen flex flex-col font-sans bg-[var(--color-page)] text-[var(--color-ink)] ${rootScaleClass}`}
    >
      {/* ── 1. Tricolor Institutional Rule (2px signature) ────────────────── */}
      <div className="flex w-full h-[2px] shrink-0" aria-hidden="true">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white border-y border-hairline/40" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* ── 2. Institutional Header Bar ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-card border-b border-hairline">
        <div
          className="mx-auto flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-2.5 min-h-[60px]"
          style={{ maxWidth: 1440 }}
        >
          {/* Emblem & Titles */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-ink text-ink-inverse flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-semibold tracking-tight text-ink text-base">
                  MetShield AI — NAWS-QMS v4.2
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono text-ink-muted bg-surface-alt border border-hairline">
                  WMO-No. 8
                </span>
              </div>
              <div className="text-xs text-ink-muted truncate">
                {lang === 'hi'
                  ? 'भारत सरकार · पृथ्वी विज्ञान मंत्रालय (MoES/IMD) · SIH26073'
                  : 'भारत सरकार · Ministry of Earth Sciences (MoES/IMD) · SIH26073'}
              </div>
            </div>
          </div>

          {/* Local evaluation cadence — honest telemetry meta */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-hairline text-xs font-mono tabular-nums">
            <span
              className="w-2 h-2 rounded-full bg-ink-faint"
              aria-hidden="true"
            />
            <span className="text-ink font-medium">2.5s cadence</span>
            <span className="text-hairline-strong" aria-hidden="true">·</span>
            <span className="text-ink-muted">{selectedStation.stationId}</span>
            <span className="text-hairline-strong" aria-hidden="true">·</span>
            <span className="text-ink font-medium">{packetCount} packets</span>
          </div>

          {/* Right Controls: GIGW Accessibility, Theme & Nav */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="flex items-center border border-hairline rounded-lg bg-card overflow-hidden text-xs font-mono"
              role="group"
              aria-label="Text size"
            >
              <button
                type="button"
                onClick={() => setFontSize('sm')}
                className={`min-h-11 sm:min-h-0 px-3 sm:px-2.5 py-1.5 transition-colors duration-150 hover:bg-surface-hover ${
                  fontSize === 'sm' ? 'bg-surface-alt font-semibold text-ink' : 'text-ink-muted'
                }`}
                title="Small text"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize('md')}
                className={`min-h-11 sm:min-h-0 px-3 sm:px-2.5 py-1.5 border-x border-hairline transition-colors duration-150 hover:bg-surface-hover ${
                  fontSize === 'md' ? 'bg-surface-alt font-semibold text-ink' : 'text-ink-muted'
                }`}
                title="Default text"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('lg')}
                className={`min-h-11 sm:min-h-0 px-3 sm:px-2.5 py-1.5 transition-colors duration-150 hover:bg-surface-hover ${
                  fontSize === 'lg' ? 'bg-surface-alt font-semibold text-ink' : 'text-ink-muted'
                }`}
                title="Large text"
              >
                A+
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="min-h-11 sm:min-h-0 px-3 py-1.5 text-xs font-medium border border-hairline rounded-lg bg-card text-ink hover:bg-surface-alt transition-colors duration-150"
              title="Switch language"
            >
              {lang === 'en' ? 'हिन्दी' : 'English'}
            </button>

            <ThemeToggle />

            <Link
              href={`/dashboard?station=${encodeURIComponent(selectedStation.stationId)}`}
              className="hidden sm:inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-lg bg-ink text-ink-inverse hover:opacity-90 transition-opacity duration-150"
            >
              Console
            </Link>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedStation.latitude},${selectedStation.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-hairline bg-card text-ink-muted hover:text-ink hover:bg-surface-alt transition-colors duration-150"
            >
              Google Maps
            </a>
          </div>
        </div>
      </header>

      {/* ── Main Canvas Content Container ─────────────────────────────────── */}
      <main id="main-content" tabIndex={-1} className="flex-1 mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-5" style={{ maxWidth: 1440 }}>
        {/* ── 3. Hero Telemetry Strip (3 Metric Cards) ────────────────────── */}
        <section aria-label="Primary station readings" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Temperature (°C) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.02 }}
            className="rounded-xl border border-hairline bg-card p-5 flex flex-col justify-between shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-muted flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-ink-muted shrink-0" strokeWidth={1.5} />
                {lang === 'hi' ? 'शुष्क बल्ब तापमान' : 'Dry-bulb temperature'}
              </span>
              <span className="text-xs font-mono text-ink-faint">
                −10 to 55 °C
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span
                className={`font-mono text-3xl font-semibold leading-none tabular-nums tracking-tight ${
                  tRaw < WMO_LIMITS.TEMP_MIN || tRaw > WMO_LIMITS.TEMP_MAX
                    ? 'text-fault-text'
                    : 'text-ink'
                }`}
              >
                {tRaw.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-ink-muted">°C</span>
              {tCorrected && (
                <span className="text-xs font-mono text-warning-text font-medium ml-auto tabular-nums">
                  Imputed {currentResult?.imputed.temperature.toFixed(1)} °C
                </span>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-hairline/70 text-xs text-ink-muted flex items-center justify-between gap-2">
              <span className="truncate">
                {selectedStation.stationId} · {selectedStation.name.split(',')[0]}{liveProvider ? ` · ${liveProvider.replace(/_/g, ' ').toLowerCase()}` : ''}
              </span>
              {tCorrected || tRaw < WMO_LIMITS.TEMP_MIN || tRaw > WMO_LIMITS.TEMP_MAX ? (
                <span className="text-fault-text font-medium shrink-0">Sensor fault</span>
              ) : (
                <span className="text-healthy-text font-medium shrink-0">Nominal</span>
              )}
            </div>
          </motion.div>

          {/* Card 2: Atmospheric Pressure (hPa) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.06 }}
            className="rounded-xl border border-hairline bg-card p-5 flex flex-col justify-between shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-muted flex items-center gap-2">
                <Gauge className="w-4 h-4 text-ink-muted shrink-0" strokeWidth={1.5} />
                {lang === 'hi' ? 'वायुमंडलीय दबाव' : 'Atmospheric pressure'}
              </span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded-md border ${
                  isHardwareActive
                    ? 'bg-healthy-bg text-healthy-text border-healthy-border font-medium'
                    : 'bg-surface-alt text-ink-muted border-hairline'
                }`}
              >
                {isHardwareActive ? 'Live hardware' : 'Simulated AWS'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-semibold leading-none tabular-nums tracking-tight text-ink">
                {pRaw.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-ink-muted">hPa</span>
              {pCorrected && (
                <span className="text-xs font-mono text-warning-text font-medium ml-auto tabular-nums">
                  Imputed {currentResult?.imputed.pressure.toFixed(1)} hPa
                </span>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-hairline/70 text-xs text-ink-muted flex items-center justify-between gap-2">
              <span>~8.4 m elevation per 1 hPa</span>
              <span className="font-mono text-ink-faint">QNH</span>
            </div>
          </motion.div>

          {/* Card 3: Relative Humidity (%) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.1 }}
            className="rounded-xl border border-hairline bg-card p-5 flex flex-col justify-between shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-muted flex items-center gap-2">
                <Droplets className="w-4 h-4 text-ink-muted shrink-0" strokeWidth={1.5} />
                {lang === 'hi' ? 'सापेक्षिक आर्द्रता' : 'Relative humidity'}
              </span>
              <span className="text-xs font-mono text-ink-faint">
                5% to 100%
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-semibold leading-none tabular-nums tracking-tight text-ink">
                {rhRaw.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-ink-muted">%</span>
              {rhCorrected && (
                <span className="text-xs font-mono text-warning-text font-medium ml-auto tabular-nums">
                  Imputed {currentResult?.imputed.humidity.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-hairline/70 text-xs text-ink-muted flex items-center justify-between gap-2">
              <span>Storm threshold: ΔRH ≥ +15%</span>
              {rhCorrected || rhRaw < WMO_LIMITS.HUM_MIN || rhRaw > WMO_LIMITS.HUM_MAX ? (
                <span className="text-fault-text font-medium shrink-0">Transducer fault</span>
              ) : (
                <span className="text-healthy-text font-medium shrink-0">Nominal</span>
              )}
            </div>
          </motion.div>
        </section>

        {/* ── Operational Status, Station Picker & One-Click Reset Bar ───── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card border border-hairline">
          <div className="flex items-center gap-2.5 text-xs min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                currentResult?.severity === 'RED_HARDWARE_FAULT'
                  ? 'bg-fault'
                  : currentResult?.severity === 'BLUE_GENUINE_WEATHER'
                  ? 'bg-weather'
                  : currentResult?.severity === 'AMBER_PROBE_FREEZE' || currentResult?.severity === 'AMBER_CALIBRATION_DRIFT'
                  ? 'bg-warning'
                  : 'bg-healthy'
              }`}
              aria-hidden="true"
            />
            <span className="font-semibold text-ink shrink-0">
              {currentResult?.alertBadge.label ?? 'Nominal (verified)'}
            </span>
            <span className="hidden md:inline text-ink-muted truncate">
              — {currentResult?.alertBadge.description ?? 'All three QC tiers passed within WMO-No. 8 limits.'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="station-selector" className="sr-only">
              Select IMD station
            </label>
            <select
              id="station-selector"
              aria-label="Select IMD station"
              value={selectedStation.stationId}
              onChange={(e) => {
                setSelectedStationId(e.target.value);
                setActiveScenario('nominal');
                activeScenarioRef.current = 'nominal';
                scenarioStepRef.current = 0;
                freezeBufferRef.current = [];
              }}
              className="min-h-11 sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-mono bg-surface-alt text-ink border border-hairline hover:border-hairline-strong transition-colors duration-150"
            >
              {IMD_AWS_STATIONS.map((s) => (
                <option key={s.stationId} value={s.stationId}>
                  {s.stationId} — {s.name.split(',')[0]}
                </option>
              ))}
            </select>
            {activeScenario !== 'nominal' && (
              <button
                type="button"
                onClick={() => triggerScenario('nominal')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-alt text-ink border border-hairline hover:bg-surface-hover transition-colors duration-150 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
                Reset to nominal
              </button>
            )}
          </div>
        </div>

        {/* ── 4. Main Split Grid (65% / 35%) ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-5 items-start">
          {/* Left Canvas (65%): Unified Recharts Time-Series Container */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.14 }}
            aria-label="Multivariate telemetry stream"
            className="rounded-xl border border-hairline overflow-hidden flex flex-col bg-card shadow-2xs"
          >
            {/* Header & Layer Toggles */}
            <div className="p-4 sm:p-5 border-b border-hairline flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  {lang === 'hi' ? 'बहु-पैरामीटर टेलीमेट्री स्ट्रीम' : 'Multivariate telemetry stream'}
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  30-frame sliding window · WMO-No. 8 physical limits
                </p>
              </div>

              {/* Quiet Series Toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowTemp(!showTemp)}
                  aria-pressed={showTemp}
                  className={`min-h-11 sm:min-h-0 px-3 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors duration-150 ${
                    showTemp
                      ? 'bg-surface-alt text-ink border-hairline-strong'
                      : 'bg-card text-ink-faint border-hairline'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--color-met-temperature)]" aria-hidden="true" />
                  Temp (°C)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPres(!showPres)}
                  aria-pressed={showPres}
                  className={`min-h-11 sm:min-h-0 px-3 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors duration-150 ${
                    showPres
                      ? 'bg-surface-alt text-ink border-hairline-strong'
                      : 'bg-card text-ink-faint border-hairline'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--color-met-pressure)]" aria-hidden="true" />
                  Pressure (hPa)
                </button>
                <button
                  type="button"
                  onClick={() => setShowHum(!showHum)}
                  aria-pressed={showHum}
                  className={`min-h-11 sm:min-h-0 px-3 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors duration-150 ${
                    showHum
                      ? 'bg-surface-alt text-ink border-hairline-strong'
                      : 'bg-card text-ink-faint border-hairline'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--color-met-humidity)]" aria-hidden="true" />
                  Humidity (%)
                </button>
              </div>
            </div>

            {/* Recharts Canvas */}
            <div
              className="p-4 sm:p-5"
              style={{ height: 360 }}
              role="img"
              aria-label={`Multivariate time series for ${selectedStation.stationId}: temperature ${tRaw.toFixed(1)} °C, pressure ${pRaw.toFixed(1)} hPa, relative humidity ${rhRaw.toFixed(1)}%.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 32, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke="var(--color-hairline)" strokeDasharray="3 3" opacity={0.7} />
                  <XAxis
                    dataKey="timeStr"
                    tick={{ fontSize: 11, fill: 'var(--color-ink-faint)', fontFamily: 'var(--font-mono)' }}
                    tickMargin={8}
                    stroke="var(--color-hairline)"
                  />
                  {/* Left Axis: Temperature */}
                  <YAxis
                    yAxisId="yTemp"
                    domain={['dataMin - 3', 'dataMax + 3']}
                    orientation="left"
                    tick={{ fontSize: 11, fill: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                    width={40}
                    stroke="var(--color-hairline)"
                    hide={!showTemp}
                  />
                  {/* Right Axis: Pressure */}
                  <YAxis
                    yAxisId="yPres"
                    domain={['dataMin - 2', 'dataMax + 2']}
                    orientation="right"
                    tick={{ fontSize: 11, fill: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                    width={64}
                    stroke="var(--color-hairline)"
                    hide={!showPres}
                  />
                  {/* Humidity Axis (shown only when Pressure is hidden to prevent dual right-axis crowding) */}
                  <YAxis
                    yAxisId="yHum"
                    domain={[0, 100]}
                    orientation="right"
                    tick={{ fontSize: 11, fill: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}
                    width={40}
                    stroke="var(--color-hairline)"
                    hide={!showHum || showPres}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      borderColor: 'var(--color-hairline)',
                      borderRadius: 8,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
                    }}
                  />

                  <ReferenceLine
                    yAxisId="yTemp"
                    y={55.0}
                    stroke="var(--color-fault)"
                    strokeDasharray="4 4"
                    label={{ value: 'WMO Max 55 °C', fill: 'var(--color-fault-text)', fontSize: 10 }}
                  />

                  {showTemp && (
                    <Line
                      yAxisId="yTemp"
                      type="monotone"
                      dataKey="temperature"
                      name="Temp (°C)"
                      stroke="var(--color-met-temperature)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={(props: { cx?: number; cy?: number; index?: number; payload?: ChartPoint }) => {
                        const pt = props.payload ?? chartData[props.index ?? 0];
                        const key = `dot-${pt?.index ?? props.index ?? 0}`;
                        if (pt?.severity === 'RED_HARDWARE_FAULT') {
                          return (
                            <circle
                              key={key}
                              cx={props.cx}
                              cy={props.cy}
                              r={4.5}
                              fill="var(--color-fault)"
                              stroke="#fff"
                              strokeWidth={1.5}
                            />
                          );
                        }
                        if (pt?.severity === 'BLUE_GENUINE_WEATHER') {
                          return (
                            <circle
                              key={key}
                              cx={props.cx}
                              cy={props.cy}
                              r={4.5}
                              fill="var(--color-weather)"
                              stroke="#fff"
                              strokeWidth={1.5}
                            />
                          );
                        }
                        return <circle key={key} cx={props.cx} cy={props.cy} r={2} fill="var(--color-met-temperature)" />;
                      }}
                    />
                  )}

                  {showPres && (
                    <Line
                      yAxisId="yPres"
                      type="monotone"
                      dataKey="pressure"
                      name="Pressure (hPa)"
                      stroke="var(--color-met-pressure)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={{ r: 2 }}
                    />
                  )}

                  {showHum && (
                    <Line
                      yAxisId="yHum"
                      type="monotone"
                      dataKey="humidity"
                      name="Humidity (%)"
                      stroke="var(--color-met-humidity)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={{ r: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Status Ticker (distinct from top status bar) */}
            <div className="px-4 sm:px-5 py-2.5 bg-surface-alt border-t border-hairline flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-ink-muted tabular-nums">
              <span>
                {liveProvider ? `Baseline: ${liveProvider.replace(/_/g, ' ').toLowerCase()}` : 'Baseline: local station model'}
              </span>
              <span className="font-medium text-ink">
                Tier {currentResult?.tierPassed ?? 3} passed · Flag {currentResult?.wmoFlag ?? 'FLAG_1_GOOD'}
              </span>
            </div>
          </motion.section>

          {/* Right Canvas (35%): Incident Stream */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.18 }}
            aria-label="Incident stream"
            className="rounded-xl border border-hairline overflow-hidden flex flex-col bg-card shadow-2xs"
          >
            <div className="p-4 sm:p-5 border-b border-hairline flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
                  {lang === 'hi' ? 'घटना स्ट्रीम' : 'Incident stream'}
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">Root-cause classification and parameter weights</p>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-mono text-ink-muted bg-surface-alt border border-hairline tabular-nums">
                {incidentList.length} {incidentList.length === 1 ? 'incident' : 'incidents'}
              </span>
            </div>

            {/* Incident Cards List */}
            <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[440px]">
              {incidentList.length === 0 ? (
                <div className="py-10 px-4 text-center text-ink-muted flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-healthy-text" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-ink">No quarantined anomalies</p>
                  <p className="text-xs text-ink-muted max-w-[28ch]">
                    Incoming readings are within WMO-No. 8 physical and thermodynamic limits.
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                {incidentList.map((inc) => (
                  <motion.div
                    layout
                    key={inc.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                    className={`p-3.5 rounded-lg border transition-colors duration-150 ${
                      inc.severity === 'RED_HARDWARE_FAULT'
                        ? 'border-fault-border bg-fault-bg/40'
                        : inc.severity === 'BLUE_GENUINE_WEATHER'
                        ? 'border-weather-border bg-weather-bg/40'
                        : 'border-warning-border bg-warning-bg/40'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-ink tabular-nums">
                        <span>{inc.stationId}</span>
                        <span className="text-ink-faint" aria-hidden="true">·</span>
                        <span className="text-ink-muted">{inc.timestampIST} IST</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[0.6875rem] font-mono font-medium ${
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
                    <p className="text-xs text-ink mt-2 leading-relaxed">
                      {inc.xai.diagnosticExplanation}
                    </p>

                    {/* Parameter Attribution Bars */}
                    <div className="mt-3 pt-2.5 border-t border-hairline/70">
                      <div className="flex items-center justify-between text-[0.6875rem] font-mono text-ink-muted mb-1.5">
                        <span>Parameter weights</span>
                        <span>Primary: {inc.xai.primaryParameter}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-surface-alt">
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
                      <div className="flex justify-between text-[0.6875rem] font-mono text-ink-faint mt-1.5 tabular-nums">
                        <span>Temp {inc.xai.tempWeight}%</span>
                        <span>Pres {inc.xai.pressWeight}%</span>
                        <span>Hum {inc.xai.humWeight}%</span>
                      </div>
                    </div>

                    {/* Operational Action */}
                    <div className="mt-2.5 p-2.5 rounded-md bg-card border border-hairline text-xs flex flex-col gap-1.5">
                      <div>
                        <span className="font-medium text-ink block mb-0.5">Recommended action</span>
                        <span className="text-ink-muted">{inc.recommendedAction}</span>
                      </div>
                      <Link
                        href={`/dashboard?station=${encodeURIComponent(inc.stationId)}`}
                        className="text-xs font-medium text-telemetry-text hover:underline self-start"
                      >
                        Inspect in Console
                      </Link>
                    </div>
                  </motion.div>
                ))}
                </AnimatePresence>
              )}
            </div>
          </motion.section>
        </div>

        {/* ── 5. Field Diagnostic & Bench Test Drawer ─────────────────────── */}
        <details className="qc-drawer rounded-xl overflow-hidden group border border-hairline bg-card shadow-2xs">
          <summary className="px-4 py-3 bg-surface-alt text-xs font-medium text-ink hover:bg-surface-hover cursor-pointer flex justify-between items-center select-none transition-colors duration-150">
            <span className="flex items-center gap-2">
              <ChevronRight className="qc-drawer-chevron w-4 h-4 text-ink-muted shrink-0" strokeWidth={1.5} />
              <Wrench className="w-4 h-4 text-ink-muted shrink-0" strokeWidth={1.5} />
              <span>NIC-MoES Field Diagnostic &amp; Bench Test Tool</span>
            </span>
            <span className="text-xs text-ink-muted group-open:hidden">
              Expand test controls and CSV export
            </span>
          </summary>

          <div className="p-5 border-t border-hairline flex flex-col gap-5 bg-card">
            {/* Fault Scenario Injections */}
            <div>
              <div className="text-xs font-medium text-ink-muted mb-2.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-ink-muted" strokeWidth={1.5} />
                Simulate hardware fault or weather event
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => triggerScenario('nominal')}
                  className={`px-3.5 py-2 text-xs font-medium border rounded-lg transition-colors duration-150 flex items-center gap-1.5 ${
                    activeScenario === 'nominal'
                      ? 'bg-healthy text-white border-healthy'
                      : 'bg-card text-ink border-hairline hover:bg-surface-hover'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Reset Network (Nominal)
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('temp-spike')}
                  className={`px-3.5 py-2 text-xs font-medium border rounded-lg transition-colors duration-150 flex items-center gap-1.5 ${
                    activeScenario === 'temp-spike'
                      ? 'bg-fault text-white border-fault'
                      : 'bg-card text-fault-text border-hairline hover:bg-fault-bg'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Simulate Thermistor Open-Circuit
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('probe-freeze')}
                  className={`px-3.5 py-2 text-xs font-medium border rounded-lg transition-colors duration-150 flex items-center gap-1.5 ${
                    activeScenario === 'probe-freeze'
                      ? 'bg-warning text-white border-warning'
                      : 'bg-card text-warning-text border-hairline hover:bg-warning-bg'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Simulate Probe Float Lock
                </button>

                <button
                  type="button"
                  onClick={() => triggerScenario('convective-storm')}
                  className={`px-3.5 py-2 text-xs font-medium border rounded-lg transition-colors duration-150 flex items-center gap-1.5 ${
                    activeScenario === 'convective-storm'
                      ? 'bg-weather text-white border-weather'
                      : 'bg-card text-weather-text border-hairline hover:bg-weather-bg'
                  }`}
                >
                  <Wind className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Simulate Convective Front Dynamics
                </button>
              </div>
            </div>

            {/* Compliance Audit Log CSV Exporter */}
            <div className="border-t border-hairline pt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-ink">
                  Meteorological audit export
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  Formatted to WMO-No. 8 and NIC/IMD headers with CSV formula sanitization.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-ink text-ink-inverse hover:opacity-90 flex items-center gap-2 transition-opacity duration-150"
              >
                <Download className="w-4 h-4" strokeWidth={1.5} />
                Export QC Audit Log (.csv)
              </button>
            </div>
          </div>
        </details>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-hairline bg-card py-3.5 px-4 sm:px-6 text-xs text-ink-muted flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">MetShield AI — NAWS-QMS v4.2</span>
          <span className="text-hairline-strong" aria-hidden="true">·</span>
          <span>MoES / IMD, Government of India</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/audit-report" className="py-2 sm:py-0 hover:text-ink transition-colors duration-150">
            Documentation
          </Link>
          <Link href="/mobile" className="py-2 sm:py-0 hover:text-ink transition-colors duration-150">
            Mobile Field Node
          </Link>
          <Link href="/dashboard" className="py-2 sm:py-0 hover:text-ink font-medium text-ink transition-colors duration-150">
            Operations Console
          </Link>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
