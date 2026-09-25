'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { Sheet, FieldRow } from '@/components/ui/Sheet';
import { TelemetryChart } from '@/components/ui/TelemetryChart';
import {
  Radio, MapPin, Send, AlertTriangle, CloudLightning, Wrench,
  TrendingDown, Activity, ArrowLeft, RefreshCw, Sliders, ShieldCheck,
  Compass, Wind, Sun, BatteryCharging, Copy, Check, Volume2, VolumeX,
} from 'lucide-react';
import Link from 'next/link';
import { getStationProfile } from '@/lib/stationData';
import { TelemetryPacket } from '@/lib/anomalyLogic';
import { useMobileSensors } from '@/hooks/useMobileSensors';
import { saveReadingLocally, getQueuedReadings, clearQueuedReading } from '@/lib/offlineStorage';

const INDIAN_CITIES = [
  { name: 'New Delhi (Safdarjung)', lat: 28.585, lon: 77.206, stationId: 'AWS-DEL-04' },
  { name: 'Mumbai (Colaba)', lat: 18.900, lon: 72.815, stationId: 'AWS-MUM-01' },
];

export default function MobileEdgeNodePage() {
  const [stationId, setStationId] = useState<string>('AWS-MOB-01');

  useEffect(() => {
    const saved = sessionStorage.getItem('naws_mobile_node_id');
    if (saved) {
      setStationId(saved);
    } else {
      const newId = `AWS-MOB-${Math.floor(Math.random() * 89) + 11}`;
      sessionStorage.setItem('naws_mobile_node_id', newId);
      setStationId(newId);
    }
  }, []);

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [temp, setTemp] = useState<number>(29.4);
  const [press, setPress] = useState<number>(1006.5);
  const [humidity, setHumidity] = useState<number>(68.0);
  const [isAutoStreaming, setIsAutoStreaming] = useState<boolean>(true);
  const [lastTransmittedTime, setLastTransmittedTime] = useState<string | null>(null);
  const [packetCounter, setPacketCounter] = useState<number>(0);
  const [lastServerVerdict, setLastServerVerdict] = useState<TelemetryPacket | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [selectedCity, setSelectedCity] = useState<string>('New Delhi (Safdarjung)');
  const [liveDataStatus, setLiveDataStatus] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isJsonCopied, setIsJsonCopied] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);

  const {
    pressure: hardwarePressure,
    isHardwareActive,
    sensorSource,
    compassHeading,
    compassCardinal,
    isOrientationActive,
    windGustKph,
    isShaking,
    solarRadiationWm2,
    batteryVoltage,
    batteryLevel,
    elevationDeltaMeters,
    triggerHaptic,
    playTelemetryChime,
  } = useMobileSensors();

  interface MobileChartPoint {
    timeIST: string;
    pressure: number;
    elevation: number;
    gust: number;
  }

  const [sensorHistory, setSensorHistory] = useState<MobileChartPoint[]>(() => {
    const pts: MobileChartPoint[] = [];
    const now = Date.now();
    for (let i = 8; i >= 0; i--) {
      pts.push({
        timeIST: new Date(now - i * 1500).toTimeString().split(' ')[0],
        pressure: 1008.2,
        elevation: 0,
        gust: 14.5,
      });
    }
    return pts;
  });

  const [chartMetric, setChartMetric] = useState<'pressure' | 'elevation' | 'gust'>('pressure');

  useEffect(() => {
    const interval = setInterval(() => {
      const curP = isHardwareActive && hardwarePressure !== null ? hardwarePressure : press;
      setSensorHistory((prev) => [
        ...prev.slice(-17),
        {
          timeIST: new Date().toTimeString().split(' ')[0],
          pressure: Math.round(curP * 10) / 10,
          elevation: Math.round((elevationDeltaMeters ?? ((1013.25 - curP) * 8.4)) * 10) / 10,
          gust: Math.round(windGustKph * 10) / 10,
        },
      ]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isHardwareActive, hardwarePressure, press, elevationDeltaMeters, windGustKph]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    getQueuedReadings().then(q => setOfflineQueueCount(q.length));
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const transmitObservation = useCallback(
    async (override?: { t?: number; p?: number; h?: number; w?: number; wd?: number; rain?: number }) => {
      setIsSending(true);
      const payload = {
        stationId,
        temperature: override?.t ?? temp,
        pressure: isHardwareActive && hardwarePressure !== null ? hardwarePressure : (override?.p ?? press),
        humidity: override?.h ?? humidity,
        windSpeed: override?.w ?? windGustKph,
        windDirection: override?.wd ?? compassHeading,
        rainfall: override?.rain ?? 0,
        solarRadiation: solarRadiationWm2,
        batteryVoltage,
        timestamp: Date.now(),
        lat: gpsCoords?.lat,
        lon: gpsCoords?.lon,
        deviceName: navigator.userAgent.includes('iPhone') ? 'iPhone Field Sensor Node' : 'Android Field Sensor Node',
        sensorSource,
      };

      try {
        if (!navigator.onLine) {
          await saveReadingLocally(payload);
          setOfflineQueueCount((await getQueuedReadings()).length);
          setLastTransmittedTime('Queued Offline');
        } else {
          const res = await fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          setPacketCounter(p => p + 1);
          setLastTransmittedTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
          if (!isAudioMuted) playTelemetryChime?.(920, 0.04);
          triggerHaptic?.(40);

          if (data?.data) {
            setLastServerVerdict(data.data);
            const channel = new BroadcastChannel('imd_naws_telemetry_stream');
            channel.postMessage({ type: 'MOBILE_PACKET_INGEST', packet: data.data });
            channel.close();
          }
        }
      } catch (e) {}
      finally { setIsSending(false); }
    },
    [stationId, temp, press, humidity, gpsCoords, isHardwareActive, hardwarePressure, sensorSource, windGustKph, compassHeading, solarRadiationWm2, batteryVoltage, isAudioMuted, playTelemetryChime, triggerHaptic]
  );

  useEffect(() => {
    if (!isAutoStreaming) return;
    const timer = setInterval(() => {
      transmitObservation({
        t: Math.round((temp + (Math.random() - 0.5) * 0.1) * 10) / 10,
        p: Math.round((press + (Math.random() - 0.5) * 0.1) * 10) / 10,
        h: Math.round((humidity + (Math.random() - 0.5) * 0.2) * 10) / 10,
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [isAutoStreaming, temp, press, humidity, transmitObservation]);

  const handleInjectSquall = () => {
    const squallP = Math.round((press - 3.4) * 10) / 10;
    const squallH = 99;
    const squallT = Math.round((temp - 3.8) * 10) / 10;
    setPress(squallP); setHumidity(squallH); setTemp(squallT);
    triggerHaptic?.([200, 100, 300]);
    if (!isAudioMuted) playTelemetryChime?.(440, 0.25);
    transmitObservation({ t: squallT, p: squallP, h: squallH, w: 78.5, rain: 14.2 });
  };

  const handleInjectSpike = () => {
    setTemp(54.8);
    transmitObservation({ t: 54.8 });
  };

  const copyTelemetryJson = () => {
    if (navigator.clipboard && lastServerVerdict) {
      navigator.clipboard.writeText(JSON.stringify(lastServerVerdict, null, 2));
      setIsJsonCopied(true);
      setTimeout(() => setIsJsonCopied(false), 2000);
    }
  };

  const header = (
    <div>
      <div className="flex w-full h-1"><div className="flex-1 bg-[#FF9933]"></div><div className="flex-1 bg-white"></div><div className="flex-1 bg-[#138808]"></div></div>
      <div className="bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--surface-sunken)] border border-[var(--border-subtle)] transition-colors"><ArrowLeft className="w-5 h-5 text-[var(--accent)]" /></Link>
          <div className="w-10 h-10 rounded-lg border border-[var(--status-nominal)] bg-[var(--surface-sunken)] flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-[var(--status-nominal)]" /></div>
          <div>
            <div className="font-bold text-sm tracking-wide flex items-center gap-2">
              METSHIELD AI
              <span className="text-[10px] bg-amber-400 text-black font-mono px-1.5 rounded uppercase tracking-widest shrink-0">Field Node</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-mono">ID: {stationId} &bull; {packetCounter} frames</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsAudioMuted(!isAudioMuted)} className="p-2 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">{isAudioMuted ? <VolumeX className="w-4 h-4 text-[var(--text-muted)]" /> : <Volume2 className="w-4 h-4 text-[var(--accent)]" />}</button>
          <div className="flex items-center gap-1.5 bg-[var(--status-nominal-bg)] border border-[var(--status-nominal)] text-[var(--status-nominal-ink)] text-xs font-mono px-2.5 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-[var(--status-nominal)] animate-pulse"></span>UPLINK</div>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell variant="field" header={header}>
      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        <Sheet>
          <FieldRow label={<div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[var(--chart-temp)]" /> Location</div>} action={
            <button className="text-xs bg-[var(--surface-sunken)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] font-medium flex items-center gap-1.5 min-touch" onClick={() => {}} disabled={isLocating}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} /> Sync GPS
            </button>
          } />
          <div className="px-4 py-3 bg-[var(--surface-sunken)] font-mono text-[11px] flex justify-between rounded-xl m-2 border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)]">LAT: <strong className="text-[var(--text-primary)]">28.585&deg;N</strong></span>
            <span className="text-[var(--text-muted)]">LON: <strong className="text-[var(--text-primary)]">77.206&deg;E</strong></span>
          </div>
        </Sheet>

        <Sheet>
          <div className="px-4 py-3 flex justify-between items-center bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)]">
            <span className="font-bold text-sm flex items-center gap-2 text-[var(--text-primary)]"><Activity className="w-4 h-4 text-[var(--chart-press)]" /> Primary Sensors</span>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase text-[var(--chart-temp)]">Temp (PT100)</div>
              <div className="text-xl font-mono font-bold mt-1 tabular-nums">{temp.toFixed(1)}&deg;</div>
              <input type="range" min={-10} max={55} step={0.1} value={temp} onChange={e => setTemp(Number(e.target.value))} className="w-full mt-2 accent-[var(--chart-temp)]" />
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase text-[var(--chart-press)]">Baro (hPa)</div>
              <div className="text-xl font-mono font-bold mt-1 tabular-nums">{press.toFixed(1)}</div>
              {!isHardwareActive ? (
                <input type="range" min={920} max={1050} step={0.1} value={press} onChange={e => setPress(Number(e.target.value))} className="w-full mt-2 accent-[var(--chart-press)]" />
              ) : (
                <div className="mt-2 text-[8px] bg-[var(--chart-press)]/20 text-[var(--chart-press)] rounded px-1 py-0.5">Live Sensor</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase text-[var(--chart-hum)]">Hum (%)</div>
              <div className="text-xl font-mono font-bold mt-1 tabular-nums">{humidity.toFixed(1)}</div>
              <input type="range" min={5} max={100} step={0.5} value={humidity} onChange={e => setHumidity(Number(e.target.value))} className="w-full mt-2 accent-[var(--chart-hum)]" />
            </div>
          </div>
        </Sheet>

        {/* Live Hardware Chart */}
        <Sheet>
           <div className="px-4 py-3 bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] flex items-center justify-between">
            <span className="font-bold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-[var(--chart-temp)] animate-pulse" /> Oscilloscope</span>
            <div className="flex bg-[var(--surface-sunken)] p-1 rounded-lg border border-[var(--border-subtle)] text-[10px]">
              <button onClick={() => setChartMetric('pressure')} className={`px-2 py-1 rounded min-touch ${chartMetric === 'pressure' ? 'bg-[var(--surface-raised)] border border-[var(--border-strong)] text-[var(--chart-press)] font-bold' : 'text-[var(--text-muted)]'}`}>Baro</button>
              <button onClick={() => setChartMetric('gust')} className={`px-2 py-1 rounded min-touch ${chartMetric === 'gust' ? 'bg-[var(--surface-raised)] border border-[var(--border-strong)] text-[var(--chart-temp)] font-bold' : 'text-[var(--text-muted)]'}`}>Gust</button>
            </div>
           </div>
           <div className="p-3 bg-[var(--surface-sunken)]">
             <TelemetryChart
               data={sensorHistory}
               dataKey={chartMetric}
               color={chartMetric === 'pressure' ? 'var(--chart-press)' : 'var(--chart-temp)'}
               unit={chartMetric === 'pressure' ? 'hPa' : 'km/h'}
               height={140}
             />
           </div>
        </Sheet>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => transmitObservation()} disabled={isSending} className="py-3 rounded-xl font-bold bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] transition-colors flex justify-center items-center gap-2 min-touch shadow-md disabled:opacity-50">
            <Send className="w-4 h-4" /> {isSending ? 'Transmitting' : 'Send Packet'}
          </button>
          <button onClick={() => setIsAutoStreaming(!isAutoStreaming)} className={`py-3 rounded-xl font-bold transition-colors flex justify-center items-center gap-2 min-touch border ${isAutoStreaming ? 'bg-[var(--status-nominal-bg)] border-[var(--status-nominal)] text-[var(--status-nominal-ink)]' : 'bg-[var(--surface-raised)] border-[var(--border-strong)] text-[var(--text-secondary)]'}`}>
            <Radio className={`w-4 h-4 ${isAutoStreaming ? 'animate-pulse' : ''}`} /> Auto: {isAutoStreaming ? 'ON' : 'OFF'}
          </button>
        </div>

        <Sheet>
          <div className="px-4 py-3 bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] font-bold text-sm flex items-center gap-2"><Sliders className="w-4 h-4 text-[var(--text-muted)]" /> Anomalies</div>
          <div className="p-4 grid grid-cols-2 gap-3">
             <button onClick={handleInjectSquall} className="text-left rounded-xl bg-[var(--surface-sunken)] p-3 border border-[var(--border-strong)] hover:bg-[var(--surface-raised)] min-touch">
               <div className="font-bold flex items-center gap-2 text-xs mb-1 text-[var(--status-watch-ink)]"><CloudLightning className="w-3.5 h-3.5" /> Squall</div>
               <div className="text-[10px] text-[var(--text-muted)] leading-tight">Baro drop + severe gust</div>
             </button>
             <button onClick={handleInjectSpike} className="text-left rounded-xl bg-[var(--surface-sunken)] p-3 border border-[var(--border-strong)] hover:bg-[var(--surface-raised)] min-touch">
               <div className="font-bold flex items-center gap-2 text-xs mb-1 text-[var(--status-critical-ink)]"><AlertTriangle className="w-3.5 h-3.5" /> Wire Fault</div>
               <div className="text-[10px] text-[var(--text-muted)] leading-tight">Temp spike to +54.8&deg;C</div>
             </button>
          </div>
        </Sheet>

        {lastServerVerdict && (
          <Sheet className="border-[var(--status-nominal)] shadow-[0_0_10px_rgba(12,163,12,0.1)] mb-4">
            <div className="bg-[var(--surface-chrome)] border-b border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-sm text-[var(--text-primary)]">QMS Feedback</span>
              <span className="text-[10px] bg-[var(--status-nominal-bg)] text-[var(--status-nominal-ink)] border border-[var(--status-nominal)] px-1.5 py-0.5 rounded font-mono">{lastServerVerdict.wmoFlag}</span>
            </div>
            <div className="p-4 text-xs">
              <div className="text-[var(--text-secondary)]">{lastServerVerdict.operationalAction}</div>
              <button onClick={copyTelemetryJson} className="mt-3 w-full py-2 bg-[var(--surface-sunken)] rounded-lg font-mono text-[10px] flex items-center justify-center gap-2 border border-[var(--border-subtle)] min-touch">
                {isJsonCopied ? <Check className="w-3.5 h-3.5 text-[var(--status-nominal)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                {isJsonCopied ? 'Copied JSON' : 'Copy Packet Hex/JSON'}
              </button>
            </div>
          </Sheet>
        )}
      </div>
    </AppShell>
  );
}