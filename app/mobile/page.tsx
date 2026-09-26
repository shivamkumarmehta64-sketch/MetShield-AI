'use client';

/**
 * Field Node — the technician's surface.
 *
 * Dark by design: this runs outdoors in glare and on OLED, and every interactive
 * element is >= 48px (`.min-touch`). It is a *capture* node, not a triage console —
 * it measures, signs off, and transmits. Triage lives on /dashboard.
 */

import React, { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, ArrowLeft, Battery, Check, ChevronDown, Compass,
  Copy, Globe, Lock, MapPin, Navigation, Radio, Send, ShieldCheck, Sliders,
  Sun, Thermometer, Volume2, VolumeX, Waves, WifiOff, Wind, Zap,
} from 'lucide-react';

import { AppShell } from '@/components/shell/AppShell';
import { useBhashini } from '@/lib/bhashini';
import { Sheet, FieldRow } from '@/components/ui/Sheet';
import { MetricTile } from '@/components/ui/MetricTile';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TelemetryChart } from '@/components/ui/TelemetryChart';
import { DigiLockerLogin } from '@/components/ui/DigiLockerLogin';
import { useMobileSensors } from '@/hooks/useMobileSensors';
import { TelemetryPacket } from '@/lib/anomalyLogic';
import {
  saveReadingLocally, getQueuedReadings, clearQueuedReading, OfflineTelemetryPacket,
} from '@/lib/offlineStorage';

type Tab = 'readings' | 'diagnostics';
type ChartMetric = 'pressure' | 'gust' | 'elevation';

interface MobileChartPoint {
  timeIST: string;
  pressure: number;
  elevation: number;
  gust: number;
}

const NODE_ID_KEY = 'naws_mobile_node_id';
const QUEUE_FLUSH_INTERVAL_MS = 15_000;

/**
 * Node identity lives in `sessionStorage`, so the id is random per session on purpose —
 * two phones in the same pocket must not claim the same station — and stable across
 * reloads of that same session.
 *
 * Read as an external store rather than mirrored into state: the server snapshot is a fixed
 * placeholder, so the SSR pass and the first client render agree on the same markup, and the
 * real id replaces it in the very same commit.
 */
function getServerNodeId() {
  return 'AWS-MOB-01';
}

function readNodeId() {
  const saved = sessionStorage.getItem(NODE_ID_KEY);
  if (saved) return saved;
  const minted = `AWS-MOB-${String(Math.floor(Math.random() * 89) + 11).padStart(2, '0')}`;
  sessionStorage.setItem(NODE_ID_KEY, minted);
  return minted;
}

function subscribeNodeId(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

export default function MobileEdgeNodePage() {
  // Node identity is persisted state, not a render-time derivation, so it is read as an
  // external store: the server snapshot is the placeholder and the client snapshot is the
  // stored id, which lands in the same commit as hydration rather than a render later.
  const stationId = useSyncExternalStore(subscribeNodeId, readNodeId, getServerNodeId);

  const [isTechVerified, setIsTechVerified] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [activeTab, setActiveTab] = useState<Tab>('readings');

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [temp, setTemp] = useState(29.4);
  const [press, setPress] = useState(1006.5);
  const [humidity, setHumidity] = useState(68);

  const [isAutoStreaming, setIsAutoStreaming] = useState(true);
  const [lastTransmittedTime, setLastTransmittedTime] = useState<string | null>(null);
  const [packetCounter, setPacketCounter] = useState(0);
  const [lastServerVerdict, setLastServerVerdict] = useState<TelemetryPacket | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isJsonCopied, setIsJsonCopied] = useState(false);
  // Browser connectivity as external store, not mirrored state. `addEventListener` is the
  // subscription the rule is written for; the first read goes straight off `navigator`.
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);

  const [sensorHistory, setSensorHistory] = useState<MobileChartPoint[]>(() => {
    const pts: MobileChartPoint[] = [];
    const now = Date.now();
    for (let i = 8; i >= 0; i--) {
      pts.push({
        timeIST: new Date(now - i * 1500).toISOString().slice(11, 19),
        pressure: 1008.2,
        elevation: 0,
        gust: 14.5,
      });
    }
    return pts;
  });
  const [chartMetric, setChartMetric] = useState<ChartMetric>('pressure');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { t } = useBhashini();

  const {
    pressure: hardwarePressure,
    isHardwareActive,
    sensorSource,
    error: sensorError,
    elevationDeltaMeters,
    compassHeading,
    compassCardinal,
    isOrientationActive,
    windGustKph,
    isShaking,
    solarRadiationWm2,
    batteryVoltage,
    batteryLevel,
    triggerHaptic,
    playTelemetryChime,
  } = useMobileSensors();

  // `transmitObservation` is recreated whenever any reading changes, and the
  // auto-stream effect depends on it. Without this ref the interval would be torn
  // down and re-armed on every reading, so it would never actually tick. The
  // override argument is part of the signature because the bench injectors pass
  // fault values to transmit instead of the current on-screen readings.
  const transmitRef = useRef<typeof transmitObservation>(async () => {});

  // Barometer is the primary instrument here, so the displayed value comes straight from
  // real hardware whenever the device reports one. `press` is only the fallback used when
  // no barometer exists — deriving beats mirroring hardware into state, which would add a
  // cascading render per sensor tick and let the copy drift from the reading.
  const barometerPressure = isHardwareActive && typeof hardwarePressure === 'number'
    ? Math.round(hardwarePressure * 10) / 10
    : null;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    getQueuedReadings().then((q) => setOfflineQueueCount(q.length));
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // The oscilloscope is a fixed-width rolling window, so it is driven by an interval that
  // ignores the readings themselves — otherwise the timer would re-arm on every sensor tick
  // and the trace would advance only as fast as the readings happen to change.
  useEffect(() => {
    const tick = () => {
      const p = barometerPressure ?? press;
      setSensorHistory((prev) => [
        ...prev.slice(-17),
        {
          timeIST: new Date().toISOString().slice(11, 19),
          pressure: p,
          elevation: Math.round((elevationDeltaMeters ?? (1013.25 - p) * 8.4) * 10) / 10,
          gust: Math.round(windGustKph * 10) / 10,
        },
      ]);
    };
    tick();
    const timer = setInterval(tick, 2500);
    return () => clearInterval(timer);
  }, [barometerPressure, press, elevationDeltaMeters, windGustKph]);

  const requestGeolocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('This browser exposes no Geolocation API.');
      return;
    }
    setIsLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          lat: Math.round(pos.coords.latitude * 1e4) / 1e4,
          lon: Math.round(pos.coords.longitude * 1e4) / 1e4,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setIsLocating(false);
      },
      (err) => {
        setGpsError(err.message || 'Location permission denied.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }, []);

  const transmitObservation = useCallback(
    async (override?: { t?: number; p?: number; h?: number; w?: number; wd?: number; rain?: number }) => {
      setIsSending(true);
      const payload: OfflineTelemetryPacket = {
        stationId,
        temperature: override?.t ?? temp,
        pressure: override?.p ?? barometerPressure ?? press,
        humidity: override?.h ?? humidity,
        windSpeed: override?.w ?? windGustKph,
        windDirection: override?.wd ?? (isOrientationActive ? compassHeading : null),
        rainfall: override?.rain ?? 0,
        solarRadiation: solarRadiationWm2,
        batteryVoltage,
        timestamp: Date.now(),
        lat: gpsCoords?.lat,
        lon: gpsCoords?.lon,
        deviceName: /iPhone|Android/i.test(navigator.userAgent)
          ? 'Mobile Field Sensor Node'
          : 'Desktop-simulated Field Node',
        sensorSource: sensorSource ?? 'UNKNOWN',
      };

      try {
        if (!navigator.onLine) {
          await saveReadingLocally(payload);
          setOfflineQueueCount((await getQueuedReadings()).length);
          setLastTransmittedTime('Queued Offline');
          return;
        }

        const res = await fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Intake returned ${res.status}`);

        const data = await res.json();
        setPacketCounter((p) => p + 1);
        setLastTransmittedTime(
          new Date().toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }),
        );
        if (!isAudioMuted) playTelemetryChime?.(920, 0.04);
        triggerHaptic?.(40);

        if (data?.data) {
          setLastServerVerdict(data.data as TelemetryPacket);
          const channel = new BroadcastChannel('imd_naws_telemetry_stream');
          channel.postMessage({ type: 'MOBILE_PACKET_INGEST', packet: data.data });
          channel.close();
        }
      } catch (err) {
        // A failed uplink must not lose the observation — it joins the queue and
        // the tech sees the pending count rather than a silent drop.
        await saveReadingLocally(payload);
        setOfflineQueueCount((await getQueuedReadings()).length);
        setLastTransmittedTime('Queued (uplink failed)');
        console.warn('[Field Node] uplink failed, queued locally:', err);
      } finally {
        setIsSending(false);
      }
    },
    [
      stationId, temp, press, humidity, gpsCoords, barometerPressure,
      sensorSource, windGustKph, isOrientationActive, compassHeading, solarRadiationWm2,
      batteryVoltage, isAudioMuted, playTelemetryChime, triggerHaptic,
    ],
  );

  useEffect(() => {
    transmitRef.current = transmitObservation;
  }, [transmitObservation]);

  useEffect(() => {
    if (!isAutoStreaming) return;
    const timer = setInterval(() => {
      void transmitRef.current();
    }, 2500);
    return () => clearInterval(timer);
  }, [isAutoStreaming]);

  // Drain the IndexedDB queue whenever connectivity returns, oldest packet first, so
  // the national console sees the technician's observations in the order they happened.
  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;
    const flush = async () => {
      const queued = await getQueuedReadings();
      if (queued.length === 0) return;
      setIsFlushing(true);
      try {
        for (const reading of queued) {
          if (cancelled) return;
          try {
            const res = await fetch('/api/telemetry', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reading),
            });
            if (!res.ok) break;
            await clearQueuedReading(reading.id as number);
            const data = await res.json();
            setPacketCounter((p) => p + 1);
            if (data?.data) {
              setLastServerVerdict(data.data as TelemetryPacket);
              const channel = new BroadcastChannel('imd_naws_telemetry_stream');
              channel.postMessage({ type: 'MOBILE_PACKET_INGEST', packet: data.data });
              channel.close();
            }
          } catch {
            break; // Still offline. Keep the rest queued and retry on the next pass.
          }
        }
        setLastTransmittedTime('Queue flushed');
      } finally {
        if (!cancelled) setIsFlushing(false);
        setOfflineQueueCount((await getQueuedReadings()).length);
      }
    };

    void flush();
    const timer = setInterval(flush, QUEUE_FLUSH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isOnline]);

  const handleInjectSquall = useCallback(() => {
    const squallP = Math.round((press - 3.4) * 10) / 10;
    const squallH = 99;
    const squallT = Math.round((temp - 3.8) * 10) / 10;
    setPress(squallP); setHumidity(squallH); setTemp(squallT);
    triggerHaptic?.([200, 100, 300]);
    if (!isAudioMuted) playTelemetryChime?.(440, 0.25);
    void transmitRef.current({ t: squallT, p: squallP, h: squallH, w: 78.5, rain: 14.2 });
  }, [press, temp, isAudioMuted, playTelemetryChime, triggerHaptic]);

  const handleInjectSpike = useCallback(() => {
    setTemp(54.8);
    triggerHaptic?.([80, 60, 80]);
    void transmitRef.current({ t: 54.8 });
  }, [triggerHaptic]);

  const copyTelemetryJson = useCallback(() => {
    if (navigator.clipboard && lastServerVerdict) {
      navigator.clipboard.writeText(JSON.stringify(lastServerVerdict, null, 2));
      setIsJsonCopied(true);
      setTimeout(() => setIsJsonCopied(false), 2000);
    }
  }, [lastServerVerdict]);

  const effectivePressure = barometerPressure ?? press;
  const effectiveGust = Math.round(windGustKph * 10) / 10;

  const verdictStatus = (() => {
    if (!lastServerVerdict) return 'nominal';
    switch (lastServerVerdict.wmoFlag) {
      case 'FLAG_1_VERIFIED_GOOD': return 'nominal';
      case 'FLAG_2_CONVECTIVE_STORM': return 'watch';
      case 'FLAG_3_SUSPECT_DRIFT': return 'serious';
      case 'FLAG_4_CORRUPT_HARDWARE': return 'critical';
      case 'FLAG_5_PACKET_LOSS': return 'lost';
      default: return 'nominal';
    }
  })();

  const header = (
    <div>
      <div className="flex w-full h-1" aria-hidden="true">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>
      <div className="bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/dashboard"
            aria-label="Back to ops console"
            className="p-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--surface-sunken)] border border-[var(--border-subtle)] transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--accent)]" />
          </Link>
          <div className="w-9 h-9 rounded-lg border border-[var(--status-nominal)] bg-[var(--surface-sunken)] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[var(--status-nominal)]" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm tracking-wide flex items-center gap-2">
              METSHIELD AI
              <span className="text-[9px] bg-[var(--status-watch)] text-black font-mono px-1.5 rounded uppercase tracking-widest shrink-0">
                Field Node
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-mono truncate" suppressHydrationWarning>
              {stationId} &bull; {packetCounter} frames
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            aria-label={language === 'en' ? 'Translate to Hindi' : 'Translate to English'}
            className="p-2 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] min-touch flex items-center gap-1"
          >
            <Globe className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-[11px] font-mono font-bold">{language === 'en' ? 'EN' : 'हि'}</span>
          </button>
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            aria-label={isAudioMuted ? 'Unmute uplink chimes' : 'Mute uplink chimes'}
            className="p-2 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] min-touch"
          >
            {isAudioMuted
              ? <VolumeX className="w-4 h-4 text-[var(--text-muted)]" />
              : <Volume2 className="w-4 h-4 text-[var(--accent)]" />}
          </button>
          {!isOnline ? (
            <div className="flex items-center gap-1.5 bg-[var(--status-watch-bg)] border border-[var(--status-watch)] text-[var(--status-watch-ink)] text-[11px] font-mono px-2 py-1 rounded-full min-touch">
              <WifiOff className="w-3.5 h-3.5" />
              {offlineQueueCount}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[var(--status-nominal-bg)] border border-[var(--status-nominal)] text-[var(--status-nominal-ink)] text-[11px] font-mono px-2 py-1 rounded-full min-touch">
              <span className="w-2 h-2 rounded-full bg-[var(--status-nominal)] animate-pulse" aria-hidden="true" />
              UPLINK
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const nav = (
    <nav className="sticky bottom-0 bg-[var(--surface-chrome)] border-t border-[var(--border-subtle)] pb-safe">
      <div className="grid grid-cols-2">
        {(['readings', 'diagnostics'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            aria-current={activeTab === tab}
            className={`min-touch py-3 font-bold text-sm flex items-center justify-center gap-2 border-t-2 transition-colors ${
              activeTab === tab
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]'
                : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            {tab === 'readings'
              ? <><Activity className="w-4 h-4" />{t('Readings')}</>
              : <><Sliders className="w-4 h-4" />{t('Diagnostics')}</>}
          </button>
        ))}
      </div>
    </nav>
  );

  if (!isTechVerified) {
    return (
      <AppShell variant="field" header={header} language={language}>
        <div className="p-4 max-w-lg mx-auto w-full space-y-4 pt-8">
          <DigiLockerLogin onSuccess={() => setIsTechVerified(true)} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant="field" header={header} nav={nav} language={language}>
      <div className="p-4 space-y-4 max-w-lg mx-auto w-full pb-6">

        {sensorError && (
          <p role="status" className="text-[11px] text-[var(--status-watch-ink)] bg-[var(--status-watch-bg)] border border-[var(--status-watch)] rounded-xl px-3 py-2">
            {sensorError}
          </p>
        )}

        {activeTab === 'readings' && (
          <>
            {/* The verdict leads. A technician opening the app wants to know whether
                the last uplink was accepted, not which gauge moved. */}
            <Sheet className={lastServerVerdict ? `border-[var(--status-${verdictStatus})]` : ''}>
              <div className="px-4 py-3 bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                <span className="font-bold text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--text-muted)]" />
                  QMS Feedback
                </span>
                {lastServerVerdict
                  ? <StatusBadge flag={lastServerVerdict.wmoFlag} />
                  : <span className="text-[10px] text-[var(--text-muted)] font-mono">AWAITING FIRST UPLINK</span>}
              </div>
              <div className="p-4 text-xs space-y-2">
                <p className="text-[var(--text-secondary)]">
                  {lastServerVerdict
                    ? lastServerVerdict.operationalAction
                    : 'Transmit a packet to receive a WMO Pub No. 8 quality verdict from the national engine.'}
                </p>
                {lastServerVerdict && (
                  <button
                    onClick={copyTelemetryJson}
                    className="w-full py-2 bg-[var(--surface-sunken)] rounded-lg font-mono text-[10px] flex items-center justify-center gap-2 border border-[var(--border-subtle)] min-touch"
                  >
                    {isJsonCopied
                      ? <Check className="w-3.5 h-3.5 text-[var(--status-nominal)]" />
                      : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                    {isJsonCopied ? 'Copied JSON' : 'Copy Packet JSON'}
                  </button>
                )}
              </div>
            </Sheet>

            <div className="grid grid-cols-2 gap-3">
              <MetricTile
                label={t('Temperature')}
                value={temp.toFixed(1)}
                unit="°C"
                icon={<Thermometer className="w-4 h-4" />}
                status={temp > 45 || temp < -5 ? 'critical' : 'nominal'}
              />
              <MetricTile
                label={t('Pressure')}
                value={effectivePressure.toFixed(1)}
                unit="hPa"
                icon={<Waves className="w-4 h-4" />}
              />
              <MetricTile
                label={t('Humidity')}
                value={humidity.toFixed(1)}
                unit="%"
                icon={<Activity className="w-4 h-4" />}
                status={humidity > 98 ? 'watch' : 'nominal'}
              />
              <MetricTile
                label="Gust"
                value={effectiveGust.toFixed(1)}
                unit="km/h"
                icon={<Wind className="w-4 h-4" />}
                status={effectiveGust > 50 ? 'serious' : 'nominal'}
              />
            </div>

            <Sheet>
              <div className="px-4 py-3 bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                <span className="font-bold text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--chart-temp)]" />
                  Oscilloscope
                </span>
                <div className="flex bg-[var(--surface-sunken)] p-1 rounded-lg border border-[var(--border-subtle)] text-[10px]">
                  {(['pressure', 'gust', 'elevation'] as ChartMetric[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setChartMetric(m)}
                      aria-pressed={chartMetric === m}
                      className={`px-2 py-1 rounded min-touch font-bold ${
                        chartMetric === m
                          ? 'bg-[var(--surface-raised)] border border-[var(--border-strong)] text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {m === 'pressure' ? 'Baro' : m === 'gust' ? 'Gust' : 'Elev'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-[var(--surface-sunken)]">
                <TelemetryChart
                  data={sensorHistory}
                  dataKey={chartMetric}
                  color={`var(--chart-${chartMetric === 'elevation' ? 'hum' : chartMetric})`}
                  unit={chartMetric === 'pressure' ? 'hPa' : chartMetric === 'gust' ? 'km/h' : 'm'}
                  height={150}
                />
              </div>
            </Sheet>

            {/* Reference readings a tech can sanity-check against, not inputs. The
                three sliders above are the only writable values. */}
            <Sheet>
              <div className="px-4 py-3 bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] font-bold text-sm flex items-center gap-2">
                <Compass className="w-4 h-4 text-[var(--text-muted)]" />
                Instrument Reference
              </div>

              <FieldRow
                label={<span className="flex items-center gap-2"><Compass className="w-4 h-4 text-[var(--chart-hum)]" /> Heading</span>}
                value={isOrientationActive ? `${compassHeading.toFixed(0)}° ${compassCardinal}` : 'No orientation data'}
              />
              <FieldRow
                label={<span className="flex items-center gap-2"><Navigation className="w-4 h-4 text-[var(--chart-press)]" /> Elevation delta</span>}
                value={elevationDeltaMeters !== null ? `${elevationDeltaMeters.toFixed(1)} m` : 'Derived from barometer'}
              />
              <FieldRow
                label={<span className="flex items-center gap-2"><Sun className="w-4 h-4 text-[var(--status-watch)]" /> Solar</span>}
                value={solarRadiationWm2 !== null ? `${solarRadiationWm2.toFixed(0)} W/m²` : 'No sensor'}
              />
              <FieldRow
                label={<span className="flex items-center gap-2"><Battery className="w-4 h-4 text-[var(--status-nominal)]" /> Battery</span>}
                value={batteryLevel !== null
                  ? `${batteryLevel.toFixed(0)}% · ${batteryVoltage?.toFixed(2) ?? '—'} V`
                  : 'No sensor'}
              />
              <FieldRow
                label={<span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[var(--chart-temp)]" /> Fix</span>}
                value={gpsCoords
                  ? `${gpsCoords.lat}°N ${gpsCoords.lon}°E · ±${gpsCoords.accuracy} m`
                  : 'Not acquired'}
                action={
                  <button
                    onClick={requestGeolocation}
                    disabled={isLocating}
                    className="text-xs bg-[var(--surface-sunken)] px-3 rounded-lg border border-[var(--border-subtle)] font-medium flex items-center gap-1.5 min-touch disabled:opacity-60"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    {isLocating ? 'Locating' : 'Sync GPS'}
                  </button>
                }
              />
              <FieldRow
                label={<span className="flex items-center gap-2"><Radio className="w-4 h-4 text-[var(--text-muted)]" /> Last uplink</span>}
                value={lastTransmittedTime ?? 'Never'}
              />

              {gpsError && (
                <p role="status" className="text-[11px] text-[var(--status-critical-ink)] bg-[var(--status-critical-bg)] px-4 py-2">
                  {gpsError}
                </p>
              )}

              {isShaking && (
                <p className="text-[11px] text-[var(--status-watch-ink)] bg-[var(--status-watch-bg)] px-4 py-2 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  Gust spike detected from device motion
                </p>
              )}

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
                className="w-full min-touch px-4 py-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-t border-[var(--border-subtle)]"
              >
                Bench controls
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="p-4 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={handleInjectSquall}
                    className="text-left rounded-xl bg-[var(--surface-sunken)] p-3 border border-[var(--border-strong)] hover:bg-[var(--surface-raised)] min-touch"
                  >
                    <span className="font-bold flex items-center gap-2 text-xs mb-1 text-[var(--status-watch-ink)]">
                      <AlertTriangle className="w-3.5 h-3.5" /> Squall
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] leading-tight block">
                      Baro drop + severe gust. Genuine weather, Flag 2.
                    </span>
                  </button>
                  <button
                    onClick={handleInjectSpike}
                    className="text-left rounded-xl bg-[var(--surface-sunken)] p-3 border border-[var(--border-strong)] hover:bg-[var(--surface-raised)] min-touch"
                  >
                    <span className="font-bold flex items-center gap-2 text-xs mb-1 text-[var(--status-critical-ink)]">
                      <Zap className="w-3.5 h-3.5" /> Wire Fault
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] leading-tight block">
                      Thermistor spike to +54.8°C. Hardware fault, Flag 4.
                    </span>
                  </button>
                </div>
              )}
            </Sheet>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => void transmitRef.current()}
                disabled={isSending}
                className="py-3 rounded-xl font-bold bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] transition-colors flex justify-center items-center gap-2 min-touch shadow-md disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Transmitting' : 'Send Packet'}
              </button>
              <button
                onClick={() => setIsAutoStreaming(!isAutoStreaming)}
                aria-pressed={isAutoStreaming}
                className={`py-3 rounded-xl font-bold transition-colors flex justify-center items-center gap-2 min-touch border ${
                  isAutoStreaming
                    ? 'bg-[var(--status-nominal-bg)] border-[var(--status-nominal)] text-[var(--status-nominal-ink)]'
                    : 'bg-[var(--surface-raised)] border-[var(--border-strong)] text-[var(--text-secondary)]'
                }`}
              >
                <Radio className={`w-4 h-4 ${isAutoStreaming ? 'animate-pulse' : ''}`} />
                Auto: {isAutoStreaming ? 'ON' : 'OFF'}
              </button>
            </div>

            {offlineQueueCount > 0 && (
              <p role="status" className="text-[11px] text-[var(--status-watch-ink)] bg-[var(--status-watch-bg)] border border-[var(--status-watch)] rounded-xl px-3 py-2 flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                {offlineQueueCount} observation{offlineQueueCount === 1 ? '' : 's'} held in the local queue
                {isFlushing && ' — flushing…'}
              </p>
            )}
          </>
        )}

        {activeTab === 'diagnostics' && (
          <div className="space-y-4 pt-2">
            <Sheet>
              <div className="px-4 py-3 bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] font-bold text-sm">
                Signal chain
              </div>
              <FieldRow label="Sensor source" value={sensorSource ?? 'UNKNOWN'} />
              <FieldRow label="Node id" value={stationId} />
              <FieldRow label="Certified technician" value="DigiLocker verified" />
              <FieldRow label="Packets this session" value={String(packetCounter)} />
            </Sheet>

            <Sheet>
              <div className="px-4 py-3 bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] font-bold text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--text-muted)]" />
                Packet provenance
              </div>
              <div className="p-4 font-mono text-[11px] space-y-1.5">
                <p className="text-[var(--text-secondary)]">
                  Every uplink is signed server-side by the WMO engine. This device
                  never holds a signing key, so anything it shows locally is
                  <span className="text-[var(--text-primary)]"> unsealed</span> until
                  the national console returns a verdict.
                </p>
                {lastServerVerdict?.securitySeal && (
                  <dl className="pt-2 space-y-1">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--text-muted)]">HMAC-SHA256</dt>
                      <dd className="text-[var(--text-primary)] truncate">
                        {lastServerVerdict.securitySeal.hmacSha256 || '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--text-muted)]">Merkle root</dt>
                      <dd className="text-[var(--text-primary)] truncate">
                        {lastServerVerdict.securitySeal.auditMerkleRoot || '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--text-muted)]">Geofence</dt>
                      <dd className="text-[var(--text-primary)]">
                        {lastServerVerdict.securitySeal.geofenceStatus}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--text-muted)]">Tamper</dt>
                      <dd className="text-[var(--text-primary)]">
                        {lastServerVerdict.securitySeal.tamperStatus}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </Sheet>
          </div>
        )}
      </div>
    </AppShell>
  );
}
