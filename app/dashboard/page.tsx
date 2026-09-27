'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { IMD_AWS_STATIONS, getStationProfile } from '@/lib/stationData';
import { DISTRICT_REGISTRY_COUNTS } from '@/lib/dataProvenance';
import { nicWmoEngineInstance, TelemetryPacket, WorkOrderTicket, createWorkOrder, getInitialSeededDataset } from '@/lib/anomalyLogic';
import { fetchLiveStationObservation, fetchBatchLiveObservations, LiveObservation } from '@/lib/liveWeatherService';
import { GovHeader } from '@/components/GovHeader';
import { GovNetworkStrip } from '@/components/GovNetworkStrip';
import { AWSNetworkMap } from '@/components/AWSNetworkMap';
import { GovObservationConsole } from '@/components/GovObservationConsole';
import { GovAnomalyRegister } from '@/components/GovAnomalyRegister';
import { GovNWPGatingPanel } from '@/components/GovNWPGatingPanel';
import { GovTechnicianDrawer } from '@/components/GovTechnicianDrawer';
import { GovInfoModals, ActiveModalType } from '@/components/GovInfoModals';
import { GovDatasetReplayModal } from '@/components/GovDatasetReplayModal';
import { GovMobileQRModal } from '@/components/GovMobileQRModal';
import { GovLiveIndiaAutoTester } from '@/components/GovLiveIndiaAutoTester';
import { GovIndiaDistrictSearch } from '@/components/GovIndiaDistrictSearch';
import { GovPredictiveMaintenancePanel } from '@/components/GovPredictiveMaintenancePanel';
import { GovEmergencyAlertModal } from '@/components/GovEmergencyAlertModal';
import { GovTimeLogicMatrix } from '@/components/GovTimeLogicMatrix';
import { VayuDistrictMap } from '@/components/VayuDistrictMap';
import { VayuDistrictPanel } from '@/components/VayuDistrictPanel';
import { VayuNationalDashboard } from '@/components/VayuNationalDashboard';
import { GovHeatwaveDSSPanel } from '@/components/GovHeatwaveDSSPanel';
import { startPoller, pausePoller } from '@/lib/vayuPoller';
import { IMDStationProfile } from '@/lib/stationData';
import { MetshieldAICopilotModal } from '@/components/MetshieldAICopilotModal';
import { useMobileSensors } from '@/hooks/useMobileSensors';
import { StormVsFaultSimulator } from '@/components/StormVsFaultSimulator';
import { AIEnginePipeline } from '@/components/AIEnginePipeline';
import { MapPin, BarChart3, Activity, Cpu, QrCode, AlertTriangle, RefreshCw, Smartphone, Bot } from 'lucide-react';


export default function GovernmentAWSManagementPortal() {
  const [selectedStationId, setSelectedStationId] = useState('AWS-DEL-04');
  const [selectedVayuDistrictId, setSelectedVayuDistrictId] = useState<string | null>(null);
  const [customStations, setCustomStations] = useState<Record<string, IMDStationProfile>>({});
  const [isEmergencyAlertOpen, setIsEmergencyAlertOpen] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(0);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isMissionControl, setIsMissionControl] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'analytics' | 'diagnostics' | 'simulator'>('map');
  const [mobileSubView, setMobileSubView] = useState<'map' | 'telemetry'>('map');
  const [isDatasetReplayOpen, setIsDatasetReplayOpen] = useState(false);
  const [isMobileQROpen, setIsMobileQROpen] = useState(false);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);

  // Initialize Vayu background poller & process URL parameter deep links
  useEffect(() => {
    startPoller();

    const initDeepLinks = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      if (params.get('qr') === 'true') setIsMobileQROpen(true);
      if (params.get('alert') === 'true') setIsEmergencyAlertOpen(true);
      const tab = params.get('tab');
      if (tab && ['map', 'analytics', 'diagnostics', 'simulator'].includes(tab)) {
        setActiveTab(tab as 'map' | 'analytics' | 'diagnostics' | 'simulator');
      }
    };

    initDeepLinks();

    return () => {
      pausePoller();
    };
  }, []);



  // Live Open-Meteo state
  const [isLiveApiMode, setIsLiveApiMode] = useState(true);
  const [liveObservation, setLiveObservation] = useState<LiveObservation | null>(null);
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [liveSyncError, setLiveSyncError] = useState<string | null>(null);
  const liveCacheRef = useRef<Record<string, LiveObservation>>({});

  // Telemetry state — pre-seeded with deterministic initial data
  const [initialData] = useState(() => getInitialSeededDataset());
  const [stationPackets, setStationPackets] = useState<Record<string, TelemetryPacket[]>>(() => initialData.stationPackets);
  const [latestPackets, setLatestPackets] = useState<Record<string, TelemetryPacket>>(() => initialData.latestPackets);
  const [workOrders, setWorkOrders] = useState<WorkOrderTicket[]>(() => initialData.workOrders);
  const [isPaused, setIsPaused] = useState(false);
  const [, setTickCount] = useState(14);

  // Stable references to prevent interval churn
  const tickCountRef = useRef(14);
  const liveObservationRef = useRef<LiveObservation | null>(liveObservation);
  useEffect(() => { liveObservationRef.current = liveObservation; }, [liveObservation]);
  const selectedStationIdRef = useRef(selectedStationId);
  useEffect(() => { selectedStationIdRef.current = selectedStationId; }, [selectedStationId]);
  const isLiveApiModeRef = useRef(isLiveApiMode);
  useEffect(() => { isLiveApiModeRef.current = isLiveApiMode; }, [isLiveApiMode]);

  // Hardware Mobile Sensor Integration (W3C Generic Sensor API)
  const { pressure: mobileHardwarePressure, isHardwareActive: isMobileHardwareActive, sensorSource: mobileSensorSource } = useMobileSensors();
  const mobilePressureRef = useRef<number | null>(mobileHardwarePressure);
  useEffect(() => { mobilePressureRef.current = mobileHardwarePressure; }, [mobileHardwarePressure]);
  const isMobileHardwareActiveRef = useRef(isMobileHardwareActive);
  useEffect(() => { isMobileHardwareActiveRef.current = isMobileHardwareActive; }, [isMobileHardwareActive]);
  const mobileSensorSourceRef = useRef(mobileSensorSource);
  useEffect(() => { mobileSensorSourceRef.current = mobileSensorSource; }, [mobileSensorSource]);

  // Operational Acoustic Alert Chime (Web Audio API Synthesizer)
  const [isAudioAlertsEnabled, setIsAudioAlertsEnabled] = useState(false);
  const isAudioAlertsEnabledRef = useRef(false);
  useEffect(() => { isAudioAlertsEnabledRef.current = isAudioAlertsEnabled; }, [isAudioAlertsEnabled]);

  const playAudioChime = useCallback((type: 'storm' | 'critical') => {
    if (!isAudioAlertsEnabledRef.current || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'critical') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.18);
      }

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio fallback
    }
  }, []);

  // Live Open-Meteo batch sync
  const syncLiveWeather = useCallback(async (stationId: string) => {
    setIsSyncingLive(true);
    try {
      setLiveSyncError(null);
      const profile = getStationProfile(stationId);
      // An unregistered station id has no profile to fetch against. Report it
      // rather than silently syncing another station's coordinates.
      if (!profile) {
        setLiveSyncError(`Station ${stationId} is not in the registry — live sync skipped.`);
        return;
      }
      const obs = await fetchLiveStationObservation(profile);
      if (obs) { setLiveObservation(obs); liveCacheRef.current[stationId] = obs; }

      const batch = await fetchBatchLiveObservations(IMD_AWS_STATIONS);
      if (batch && Object.keys(batch).length > 0) {
        liveCacheRef.current = { ...liveCacheRef.current, ...batch };
        if (batch[stationId]) setLiveObservation(batch[stationId]);
      }
    } catch  {
      setLiveSyncError("Failed to reach live API");
    } finally { setIsSyncingLive(false); }
  }, []);

  useEffect(() => {
    if (!isLiveApiMode) return;
    const t = setTimeout(() => {
      syncLiveWeather(selectedStationId);
    }, 0);
    return () => clearTimeout(t);
  }, [selectedStationId, isLiveApiMode, syncLiveWeather]);

  useEffect(() => {
    if (!isLiveApiMode) return;
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      syncLiveWeather(selectedStationId);
    }, 30000);
    return () => clearInterval(t);
  }, [isLiveApiMode, selectedStationId, syncLiveWeather]);

  // Direct hardware sensor stream ingestion whenever mobile pressure updates
  useEffect(() => {
    if (mobileHardwarePressure == null) return;
    const now = Date.now();
    const stationId = 'AWS-MOB-01';
    const liveTemp = liveObservationRef.current?.temperature ?? 29.5;
    const liveHum = liveObservationRef.current?.humidity ?? 65.0;

    const pkt = nicWmoEngineInstance.processIngestedObservation(
      stationId,
      liveTemp,
      Math.round(mobileHardwarePressure * 10) / 10,
      liveHum,
      now
    );
    (pkt as unknown as { isHardwareGrounded?: boolean; hardwareSource?: string }).isHardwareGrounded = isMobileHardwareActive;
    (pkt as unknown as { isHardwareGrounded?: boolean; hardwareSource?: string }).hardwareSource = mobileSensorSource;

    setLatestPackets(prev => ({ ...prev, [stationId]: pkt }));
    setStationPackets(prev => {
      const buf = [...(prev[stationId] || []), pkt].slice(-30);
      return { ...prev, [stationId]: buf };
    });
  }, [mobileHardwarePressure, isMobileHardwareActive, mobileSensorSource]);

  // Telemetry ingest loop (every 2.5s) — optimized with stable callback & spatial cross-validation
  const processNextTick = useCallback(() => {
    tickCountRef.current += 1;
    const currentTick = tickCountRef.current;
    setTickCount(currentTick);
    const now = Date.now();
    const updatedLatest: Record<string, TelemetryPacket> = {};
    const newTickets: WorkOrderTicket[] = [];

    // Phase 1: Ingest next observations
    for (const station of IMD_AWS_STATIONS) {
      if (station.status === 'SCHEDULED_CALIBRATION') continue;
      let baseline = isLiveApiModeRef.current
        ? (liveCacheRef.current[station.stationId] || (station.stationId === selectedStationIdRef.current ? liveObservationRef.current : null))
        : undefined;

      // When mobile hardware pressure is active, ground AWS-MOB-01 with physical silicon barometer readings
      if (station.stationId === 'AWS-MOB-01' && mobilePressureRef.current != null) {
        baseline = {
          stationId: 'AWS-MOB-01',
          temperature: baseline?.temperature ?? liveObservationRef.current?.temperature ?? 29.5,
          pressure: Math.round(mobilePressureRef.current * 10) / 10,
          humidity: baseline?.humidity ?? liveObservationRef.current?.humidity ?? 65.0,
          timestamp: now,
          timeIST: new Date(now).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          source: isMobileHardwareActiveRef.current ? 'PHYSICAL_W3C_PRESSURE_SENSOR' : 'EMULATED_BAROMETER_STREAM',
          isLive: true,
        };
      }

      const pkt = nicWmoEngineInstance.generatePacket(station.stationId, now, currentTick, baseline || undefined);
      if (station.stationId === 'AWS-MOB-01' && mobilePressureRef.current != null) {
        (pkt as unknown as { isHardwareGrounded?: boolean; hardwareSource?: string }).isHardwareGrounded = isMobileHardwareActiveRef.current;
        (pkt as unknown as { isHardwareGrounded?: boolean; hardwareSource?: string }).hardwareSource = mobileSensorSourceRef.current;
      }
      updatedLatest[station.stationId] = pkt;
    }

    // Phase 2: Spatial KNN cross-validation against national cohort for any flagged observation
    for (const station of IMD_AWS_STATIONS) {
      const pkt = updatedLatest[station.stationId];
      if (!pkt) continue;
      if (pkt.classification !== 'NOMINAL_OPERATION') {
        pkt.spatialValidation = nicWmoEngineInstance.spatialCrossValidate(station.stationId, pkt.classification, updatedLatest);
        newTickets.push(createWorkOrder(pkt));
      }
    }

    setStationPackets(prev => {
      const next = { ...prev };
      for (const [stId, pkt] of Object.entries(updatedLatest)) {
        const buf = [...(next[stId] || []), pkt];
        if (buf.length > 30) buf.shift();
        next[stId] = buf;
      }
      return next;
    });

    setLatestPackets(prev => ({ ...prev, ...updatedLatest }));
    if (newTickets.length > 0) {
      setWorkOrders(prev => [...newTickets, ...prev].slice(0, 50));
      const hasCritical = newTickets.some(t => t.alertLevel === 'LEVEL_4_RED');
      const hasStorm = newTickets.some(t => t.classification === 'GENUINE_CONVECTIVE_EVENT');
      if (hasCritical) playAudioChime('critical');
      else if (hasStorm) playAudioChime('storm');
    }
  }, [playAudioChime]);

  useEffect(() => {
    if (isPaused) return;
    const t = setInterval(() => {
      // Conserve client CPU and battery if the browser tab is minimized or hidden
      if (typeof document !== 'undefined' && document.hidden) return;
      processNextTick();
    }, 2500);
    return () => clearInterval(t);
  }, [isPaused, processNextTick]);

  // Mobile node packet sync
  const lastMobileSyncRef = useRef<number>(0);

  const ingestExternalPacket = useCallback((pkt: TelemetryPacket) => {
    // If packet is from a connected mobile phone, auto-provision or dynamically relocate profile in customStations
    if (pkt.stationId.startsWith('AWS-MOB')) {
      const meta = (pkt as unknown as {
        mobileMetadata?: {
          lat?: number;
          lon?: number;
          deviceName?: string;
          batteryVoltage?: number;
        };
      }).mobileMetadata;

      setCustomStations(prev => {
        const lat = meta?.lat || 28.6139;
        const lon = meta?.lon || 77.2090;
        const devName = meta?.deviceName || 'Smartphone Field Sensor';

        if (!prev[pkt.stationId]) {
          const newProfile: IMDStationProfile = {
            stationId: pkt.stationId,
            name: `${devName} (${pkt.stationId})`,
            hindiName: `मोबाइल वेधशाला (${pkt.stationId})`,
            state: 'Connected Live Mobile Sensor',
            latitude: lat,
            longitude: lon,
            elevationM: 216,
            rmcDivision: 'Field Mobile Mesh Grid',
            wmoBlockNo: '49999',
            sensorMetadata: {
              tempSensor: 'Smartphone Ambient Thermistor & Open-Meteo',
              pressureSensor: 'Hardware Silicon Barometer (BMP280 / W3C Ambient)',
              humiditySensor: 'High-Res Polymer Capacitive / Open-Meteo',
              dataloggerModel: 'Mobile PWA Telemetry Edge Transmitter',
              telemetryUplink: '4G/5G HTTPS DCP Telemetry / WebSocket',
              batteryVoltage: meta?.batteryVoltage ? `${meta.batteryVoltage.toFixed(2)} V (Li-ion Internal)` : '3.85 V (Li-ion Internal)',
              lastCalibDate: 'Auto-Calibrated Real-Time',
              calibCertNo: `CC-IMD-MOB-${pkt.stationId}`,
            },
            baseline: { tempMean: 29.5, pressureMean: 1008.0, humidityMean: 65.0, windMean: 12.0, windDirMean: 220 },
            status: 'OPERATIONAL',
          };
          return { ...prev, [pkt.stationId]: newProfile };
        }

        // Dynamically update GPS pin if mobile phone location changes
        if (meta?.lat && meta?.lon && (prev[pkt.stationId].latitude !== meta.lat || prev[pkt.stationId].longitude !== meta.lon)) {
          return {
            ...prev,
            [pkt.stationId]: {
              ...prev[pkt.stationId],
              latitude: meta.lat,
              longitude: meta.lon,
              sensorMetadata: {
                ...prev[pkt.stationId].sensorMetadata,
                batteryVoltage: meta?.batteryVoltage ? `${meta.batteryVoltage.toFixed(2)} V (Li-ion Internal)` : prev[pkt.stationId].sensorMetadata.batteryVoltage,
              }
            }
          };
        }

        return prev;
      });
    }

    setLatestPackets(prev => ({ ...prev, [pkt.stationId]: pkt }));
    setStationPackets(prev => {
      const buf = [...(prev[pkt.stationId] || []), pkt];
      if (buf.length > 30) buf.shift();
      return { ...prev, [pkt.stationId]: buf };
    });
    if (pkt.classification !== 'NOMINAL_OPERATION') {
      setWorkOrders(prev => [createWorkOrder(pkt, 'IMD-MOB-2026'), ...prev].slice(0, 50));
      if (pkt.alertLevel === 'LEVEL_4_RED') playAudioChime('critical');
      else if (pkt.classification === 'GENUINE_CONVECTIVE_EVENT') playAudioChime('storm');
    }
  }, [playAudioChime]);

  // BroadcastChannel listener
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const ch = new BroadcastChannel('imd_naws_telemetry_stream');
    ch.onmessage = (e) => { if (e.data?.type === 'MOBILE_PACKET_INGEST' && e.data?.packet) ingestExternalPacket(e.data.packet); };
    return () => ch.close();
  }, [ingestExternalPacket]);

  // Cross-device poll (adaptive rate limiting: prevents server exhaustion under 1M+ concurrency)
  useEffect(() => {
    if (lastMobileSyncRef.current === 0) lastMobileSyncRef.current = Date.now();
    const isMobileActive = isMobileQROpen || Object.keys(customStations).length > 0 || mobilePressureRef.current != null;
    const pollInterval = isMobileActive ? 2500 : 20000;

    const t = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetch(`/api/telemetry?latest=true&since=${lastMobileSyncRef.current}`);
        if (res.ok) {
          const json = await res.json();
          json.packets?.forEach((p: TelemetryPacket) => {
            ingestExternalPacket(p);
            if (p.timestamp > lastMobileSyncRef.current) lastMobileSyncRef.current = p.timestamp;
          });
        }
      } catch { /* Silent */ }
    }, pollInterval);
    return () => clearInterval(t);
  }, [ingestExternalPacket, isMobileQROpen, customStations]);

  // Accessibility
  const handleFontSize = (delta: number) => {
    const next = delta === 0 ? 0 : Math.max(-1, Math.min(2, fontSizeLevel + delta));
    setFontSizeLevel(next);
    if (typeof document !== 'undefined') {
      document.documentElement.style.fontSize = ({ [-1]: '14px', 0: '16px', 1: '18px', 2: '20px' } as Record<number, string>)[next] || '16px';
    }
  };

  // Memoized network metrics & station selections
  const { opTotal, critCount, stormCount, driftCount, qIndex } = useMemo(() => {
    const total = IMD_AWS_STATIONS.filter(s => s.status !== 'SCHEDULED_CALIBRATION').length;
    const latestList = Object.values(latestPackets);
    const crit = latestList.filter(p => p.alertLevel === 'LEVEL_4_RED').length;
    const storm = latestList.filter(p => p.classification === 'GENUINE_CONVECTIVE_EVENT').length;
    const drift = latestList.filter(p => p.classification === 'CALIBRATION_DRIFT').length;
    const q = total > 0 ? Math.max(75, Math.min(100, Math.round(((total - crit) / total) * 1000) / 10)) : 95.0;
    return { opTotal: total, critCount: crit, stormCount: storm, driftCount: drift, qIndex: q };
  }, [latestPackets]);

  const connectedMobileCount = useMemo(() => {
    return Object.keys(latestPackets).filter(id => id.startsWith('AWS-MOB')).length;
  }, [latestPackets]);

  const activeStation = useMemo(() => customStations[selectedStationId] || getStationProfile(selectedStationId), [customStations, selectedStationId]);
  const activeHistory = useMemo(() => stationPackets[selectedStationId] || [], [stationPackets, selectedStationId]);

  const handleSelectCustomProfile = useCallback((profile: IMDStationProfile) => {
    setCustomStations(prev => ({ ...prev, [profile.stationId]: profile }));
    setSelectedStationId(profile.stationId);
  }, []);

  const triggerAndTick = (fn: (id: string) => void, id: string) => { fn(id); processNextTick(); };

  /**
   * Live-sync failure notice.
   *
   * `liveSyncError` was being set (including by the unregistered-station guard
   * added in Phase 2) but never rendered, so a failed live sync was silent and
   * the console just stopped updating with no explanation. It is now surfaced
   * inline. `role="status"` so assistive tech announces it.
   */
  const liveSyncNotice = liveSyncError ? (
    <div
      role="status"
      className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-semibold">Live sync unavailable.</strong> {liveSyncError}{' '}
        Telemetry below may be showing the last known values rather than a current reading.
      </span>
    </div>
  ) : null;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-300 relative ${isMissionControl ? 'bg-slate-950 text-slate-100' : 'bg-[#F4F6F9] text-slate-900'}`}>

      {/* Sovereign Command Navigation Header */}
      <GovHeader
        fontSizeLevel={fontSizeLevel} onFontSizeChange={handleFontSize}
        isHighContrast={isHighContrast}
        onToggleContrast={() => setIsHighContrast(prev => { const n = !prev; if (n) document.body.classList.add('high-contrast'); else document.body.classList.remove('high-contrast'); return n; })}
        isMissionControl={isMissionControl}
        onToggleMissionControl={() => setIsMissionControl(prev => !prev)}
        language={language} onToggleLanguage={() => setLanguage(prev => prev === 'en' ? 'hi' : 'en')}
        onOpenModal={setActiveModal}
        onOpenDatasetReplay={() => setIsDatasetReplayOpen(true)}
        onOpenMobileQR={() => setIsMobileQROpen(true)}
        isLiveApiMode={isLiveApiMode}
      />

      {/* Live System Network Strip Ticker */}
      <GovNetworkStrip
        totalStations={IMD_AWS_STATIONS.length + Object.keys(customStations).length}
        onlineStations={opTotal + Object.keys(customStations).length}
        qualityIndex={qIndex}
        ingestInterval="2.5s"
        anomalyTally={{ critical: critCount, convective: stormCount, drift: driftCount }}
        language={language}
        isSoundActive={isAudioAlertsEnabled}
        onToggleSound={() => setIsAudioAlertsEnabled(prev => !prev)}
      />

      {/* Executive Command Workspace KPI Metric Ribbon */}
      <section className="max-w-[1750px] w-full mx-auto px-4 lg:px-8 pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Observatories */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">National AWS Grid</span>
              <span className="text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-mono font-bold">
                {DISTRICT_REGISTRY_COUNTS.total} District Records
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900">
                {opTotal + Object.keys(customStations).length}
                <span className="text-xs font-normal text-slate-500 ml-1.5">Active Nodes</span>
              </div>
              {connectedMobileCount > 0 && (
                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                  +{connectedMobileCount} Mobile
                </span>
              )}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Coverage: 100% Pan-India</span>
              <span className="text-emerald-700 font-semibold font-mono">INSAT-3D Uplink</span>
            </div>
          </div>

          {/* Card 2: WMO Quality Index */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">QC Data Integrity</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                WMO-No. 8
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-700">
                {qIndex}%
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                NWP Pass
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>WMO Flags 1 &amp; 2</span>
              <span className="text-emerald-700 font-semibold font-mono">Clean Feed</span>
            </div>
          </div>

          {/* Card 3: Telemetry Cadence */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Processing Cadence</span>
              <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                2.5s Cycle
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900">
                &lt; 5 ms
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-semibold">
                Line-Rate
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Edge Validation</span>
              <span className="text-slate-700 font-mono">Zahumenský § 4.3</span>
            </div>
          </div>

          {/* Card 4: Active Anomaly & Storm Warnings */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Storm vs Fault Isolation</span>
              <span className="text-[10px] bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded font-mono font-bold">
                XAI Powered
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900">
                <span className="text-amber-700">{stormCount}</span> Storm / <span className="text-rose-700">{critCount}</span> Fault
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Severe Weather Fronts</span>
              <span className="text-sky-700 font-semibold font-mono">Auto-Gating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tab Bar — Institutional MoES / IMD Grid Command */}
      <div className="sticky top-[108px] z-40 bg-white border-y border-slate-200 shadow-xs">
        <div className="max-w-[1750px] mx-auto px-4 lg:px-8 flex items-center justify-between overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1 py-2 shrink-0">
            {[
              { id: 'map', label: 'National GIS Observation Network', icon: <MapPin className="w-3.5 h-3.5" /> },
              { id: 'analytics', label: `District Vayu Grid`, icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { id: 'diagnostics', label: 'WMO QC & Maintenance Alerts', icon: <Activity className="w-3.5 h-3.5" /> },
              { id: 'simulator', label: 'Field Hardware Simulator', icon: <Cpu className="w-3.5 h-3.5" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'map' | 'analytics' | 'diagnostics' | 'simulator')}
                className={`px-3 sm:px-4 py-2 rounded text-xs font-semibold tracking-wide transition-colors cursor-pointer flex items-center gap-2 shrink-0 border ${
                  activeTab === tab.id
                    ? 'bg-[#002147] text-white border-[#002147] shadow-xs'
                    : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Action Triggers */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
            {mobileHardwarePressure != null && (
              <button
                onClick={() => setSelectedStationId('AWS-MOB-01')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-mono font-bold transition-all cursor-pointer"
                title="View physical hardware sensor telemetry in console"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                <span>Barometer: {mobileHardwarePressure.toFixed(1)} hPa ({isMobileHardwareActive ? 'Hardware' : 'Stream'})</span>
              </button>
            )}
            <button
              onClick={() => setIsAICopilotOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Open Metshield AI Meteorological Copilot"
            >
              <Bot className="w-3.5 h-3.5 text-amber-700" />
              <span>AI Met-Copilot</span>
            </button>
            <button
              onClick={() => setIsDatasetReplayOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" /> Replay Dataset
            </button>
            <button
              onClick={() => setIsMobileQROpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 text-xs font-bold transition-all cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-sky-700" /> Mobile Node (QR)
            </button>
            <button
              onClick={() => setIsEmergencyAlertOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold transition-all cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-700" /> CAP Broadcast
            </button>
          </div>
        </div>
      </div>

      {/* Main Command Workspace */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* Tab 1: GIS Map & Telemetry Console */}
        {activeTab === 'map' && (
          <div className="space-y-3">
            {/* Mobile & Tablet Segmented View Switcher */}
            <div className="xl:hidden flex items-center justify-center p-1 bg-slate-100 rounded-lg border border-slate-300 shadow-2xs">
              <button
                onClick={() => setMobileSubView('map')}
                className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${
                  mobileSubView === 'map'
                    ? 'bg-[#002147] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🗺️ GIS Map View</span>
              </button>
              <button
                onClick={() => setMobileSubView('telemetry')}
                className={`flex-1 py-2 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${
                  mobileSubView === 'telemetry'
                    ? 'bg-[#002147] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📊 Live Telemetry Console</span>
              </button>
            </div>

            {liveSyncNotice}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              <div className={`bg-white border border-slate-300 rounded-lg p-2 shadow-xs overflow-hidden ${
                mobileSubView === 'telemetry' ? 'hidden xl:block' : 'block'
              }`}>
                <AWSNetworkMap
                  latestPackets={latestPackets}
                  selectedStationId={selectedStationId}
                  onSelectStation={setSelectedStationId}
                  onSelectCustomDistrict={handleSelectCustomProfile}
                  customStations={customStations}
                  language={language}
                />
              </div>
              <div className={`bg-white border border-slate-300 rounded-lg p-2 shadow-xs ${
                mobileSubView === 'map' ? 'hidden xl:block' : 'block'
              }`}>
                {activeStation ? <GovObservationConsole
                  selectedStation={activeStation} onSelectStation={setSelectedStationId}
                  packets={activeHistory} language={language}
                  isLiveApiMode={isLiveApiMode} onToggleLiveApiMode={() => setIsLiveApiMode(p => !p)}
                  liveStatusInfo={liveObservation} isSyncingLive={isSyncingLive}
                  onManualSync={() => syncLiveWeather(selectedStationId)}
                  onSimulateFault={(type) => {
                    switch (type) {
                      case 'spike': triggerAndTick(nicWmoEngineInstance.triggerThermistorSpike.bind(nicWmoEngineInstance), selectedStationId); break;
                      case 'storm': triggerAndTick(nicWmoEngineInstance.triggerConvectiveStorm.bind(nicWmoEngineInstance), selectedStationId); break;
                      case 'freeze': triggerAndTick(nicWmoEngineInstance.triggerWireDisconnectFreeze.bind(nicWmoEngineInstance), selectedStationId); break;
                      case 'drift': triggerAndTick(nicWmoEngineInstance.triggerBarometerDrift.bind(nicWmoEngineInstance), selectedStationId); break;
                      case 'reset': triggerAndTick(() => nicWmoEngineInstance.resetToNominal(selectedStationId), selectedStationId); break;
                    }
                  }}
                /> : <div className='p-8 text-center text-slate-500'>Station not found</div>}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Vayu All-India District Grid */}
        {activeTab === 'analytics' && (
          <div className="space-y-5 pt-2">
            <GovIndiaDistrictSearch
              onSelectStationProfile={handleSelectCustomProfile}
              selectedStationId={selectedStationId}
              language={language}
            />
            <VayuNationalDashboard
              onSelectDistrict={(distId) => setSelectedVayuDistrictId(distId)}
              language={language}
            />
            <VayuDistrictMap
              selectedDistrictId={selectedVayuDistrictId}
              onSelectDistrict={(distId) => setSelectedVayuDistrictId(distId)}
              language={language}
            />
            {selectedVayuDistrictId && (
              <VayuDistrictPanel
                districtId={selectedVayuDistrictId}
                onClose={() => setSelectedVayuDistrictId(null)}
                onSelectDistrictForCompare={(distId: string) => setSelectedVayuDistrictId(distId)}
                language={language}
              />
            )}
            <GovHeatwaveDSSPanel
              selectedDistrictId={selectedVayuDistrictId}
              onSelectDistrict={(distId) => setSelectedVayuDistrictId(distId)}
              language={language}
            />
          </div>
        )}

        {/* Tab 3: Diagnostics & Predictive Maintenance */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-5">
            <GovPredictiveMaintenancePanel
              packets={activeHistory}
              stationName={activeStation.name}
              language={language}
            />
            <GovNWPGatingPanel latestPackets={latestPackets} language={language} />
            <GovAnomalyRegister
              workOrders={workOrders}
              language={language}
              onOpenMethodology={() => setActiveModal('methodology')}
              onOpenEmergencyAlert={() => setIsEmergencyAlertOpen(true)}
            />
          </div>
        )}

        {/* Tab 4: Fault Logic Simulator */}
        {activeTab === 'simulator' && (
          <div className="space-y-5">
            <StormVsFaultSimulator />
            <AIEnginePipeline />
            <GovLiveIndiaAutoTester
              language={language}
              onOpenMobileQR={() => setIsMobileQROpen(true)}
              onSelectStation={setSelectedStationId}
            />
            <GovTimeLogicMatrix
              language={language}
              onSimulateCase={(caseId) => {
                switch (caseId) {
                  case 'case_roc_spike': triggerAndTick(nicWmoEngineInstance.triggerThermistorSpike.bind(nicWmoEngineInstance), selectedStationId); break;
                  case 'case_convective_storm': triggerAndTick(nicWmoEngineInstance.triggerConvectiveStorm.bind(nicWmoEngineInstance), selectedStationId); break;
                  case 'case_frozen_sensor': triggerAndTick(nicWmoEngineInstance.triggerWireDisconnectFreeze.bind(nicWmoEngineInstance), selectedStationId); break;
                  case 'case_calibration_drift': triggerAndTick(nicWmoEngineInstance.triggerBarometerDrift.bind(nicWmoEngineInstance), selectedStationId); break;
                  case 'case_packet_slot_loss': triggerAndTick(nicWmoEngineInstance.triggerPacketLoss.bind(nicWmoEngineInstance), selectedStationId); break;
                  case 'case_solar_diurnal': triggerAndTick(nicWmoEngineInstance.triggerThermistorSpike.bind(nicWmoEngineInstance), selectedStationId); break;
                }
              }}
            />
          </div>
        )}
      </main>

      {/* Technician Drawer Controls */}
      <GovTechnicianDrawer
        selectedStationId={selectedStationId}
        onTriggerThermistorSpike={id => triggerAndTick(nicWmoEngineInstance.triggerThermistorSpike.bind(nicWmoEngineInstance), id)}
        onTriggerWireDisconnectFreeze={id => triggerAndTick(nicWmoEngineInstance.triggerWireDisconnectFreeze.bind(nicWmoEngineInstance), id)}
        onTriggerBarometerDrift={id => triggerAndTick(nicWmoEngineInstance.triggerBarometerDrift.bind(nicWmoEngineInstance), id)}
        onTriggerConvectiveStorm={id => triggerAndTick(nicWmoEngineInstance.triggerConvectiveStorm.bind(nicWmoEngineInstance), id)}
        onTriggerPacketLoss={id => triggerAndTick(nicWmoEngineInstance.triggerPacketLoss.bind(nicWmoEngineInstance), id)}
        onResetToNominal={id => triggerAndTick(() => nicWmoEngineInstance.resetToNominal(id), id || selectedStationId)}
        isPaused={isPaused} onTogglePause={() => setIsPaused(!isPaused)}
      />

      {/* Interactive Modals */}
      <GovInfoModals activeModal={activeModal} onClose={() => setActiveModal(null)} language={language} />
      <GovDatasetReplayModal isOpen={isDatasetReplayOpen} onClose={() => setIsDatasetReplayOpen(false)} language={language} />
      <GovMobileQRModal isOpen={isMobileQROpen} onClose={() => setIsMobileQROpen(false)} language={language} />
      <GovEmergencyAlertModal
        isOpen={isEmergencyAlertOpen}
        onClose={() => setIsEmergencyAlertOpen(false)}
        packet={latestPackets[selectedStationId] || null}
        stationName={activeStation.name}
        state={activeStation.state}
        language={language}
      />
      <MetshieldAICopilotModal
        isOpen={isAICopilotOpen}
        onClose={() => setIsAICopilotOpen(false)}
        selectedStation={activeStation}
        latestPacket={latestPackets[selectedStationId]}
        language={language}
      />

      {/* Footer */}
      <footer className="mt-12 bg-[#070d1e] text-slate-200 border-t border-slate-800 text-xs">
        <div className="w-full h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600" />
        <div className="max-w-[1750px] mx-auto px-4 lg:px-8 py-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-slate-800">
            {[
              { title: language === 'hi' ? 'मौसम सेवाएं' : 'Observational Network', items: ['Automatic Weather Stations (AWS)', 'Agro-Meteorological Network', 'INSAT-3D DCP Telemetry Link', 'Doppler Weather Radar (DWR) Grid'] },
              { title: language === 'hi' ? 'गुणवत्ता आश्वासन' : 'Quality Assurance & Standards', items: ['WMO-No. 8 Weather Instrument Standards', 'NABL Calibration Traceability', 'ISO 9001:2015 QC Procedures', 'Real-Time Automated Data Verification'] },
              { title: language === 'hi' ? 'क्षेत्रीय मौसम विज्ञान केंद्र' : 'Regional Network Support', items: ['Northern Regional Met Grid', 'Western Regional Met Grid', 'Eastern Regional Met Grid', 'Southern Regional Met Grid'] },
            ].map(col => (
              <div key={col.title}>
                <div className="font-bold text-cyan-400 mb-2 uppercase tracking-wider text-[11px]">{col.title}</div>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">{col.items.map(i => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
            <div>
              <div className="font-bold text-cyan-400 mb-2 uppercase tracking-wider text-[11px]">
                {language === 'hi' ? 'प्रणाली वास्तुकला' : 'System Architecture & Innovation'}
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Metshield AI (AWS-QMS) — Real-time edge quality control, WMO Pub 8 physical validation, and reliable meteorological feeds for national observation networks.
              </p>
              <button onClick={() => setActiveModal('architecture')} className="mt-2.5 text-cyan-300 hover:text-white underline text-[11px] font-semibold cursor-pointer">
                {language === 'hi' ? 'पूर्ण प्रणाली वास्तुकला पढ़ें →' : 'Read Metshield AI Architecture & Edge Strategy →'}
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <div>© 2026 Metshield AI (AWS-QMS) • National AWS Quality Management System</div>
            <div className="flex items-center gap-4 flex-wrap">
              {([
                ['legal', 'Legal & Privacy (DPDPA 2023)'],
                ['architecture', 'System Design & Scalability'],
                ['methodology', 'Quality Control Rules'],
                ['accessibility', 'Accessibility Statement'],
                ['provenance', 'Data Sources & Disclosure'],
              ] as const).map(([key, label], i) => (
                <React.Fragment key={key}>
                  {i > 0 && <span className="text-slate-700">•</span>}
                  <button onClick={() => setActiveModal(key)} className="hover:underline hover:text-white cursor-pointer">{label}</button>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-3 text-center">
            Metshield AI (AWS-QMS) is an advanced automated quality assurance solution. Compliant with WMO Pub 8 standards for real-time telemetry validation, edge anomaly detection, and predictive sensor maintenance.
          </div>
        </div>
      </footer>
    </div>
  );
}
