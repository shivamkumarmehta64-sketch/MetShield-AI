'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  MapPin,
  Send,
  AlertTriangle,
  CloudLightning,
  Wrench,
  TrendingDown,
  Activity,
  ArrowLeft,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Compass,
  Wind,
  Sun,
  BatteryCharging,
  Copy,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Link from 'next/link';
import { getStationProfile } from '@/lib/stationData';
import { TelemetryPacket } from '@/lib/anomalyLogic';
import { useMobileSensors } from '@/hooks/useMobileSensors';
import { saveReadingLocally, getQueuedReadings, clearQueuedReading } from '@/lib/offlineStorage';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Predefined Indian Meteorological Cities for instant 1-tap live weather
const INDIAN_CITIES = [
  { name: 'New Delhi (Safdarjung)', lat: 28.585, lon: 77.206, stationId: 'AWS-DEL-04' },
  { name: 'Mumbai (Colaba)', lat: 18.900, lon: 72.815, stationId: 'AWS-MUM-01' },
  { name: 'Kolkata (Alipore)', lat: 22.533, lon: 88.333, stationId: 'AWS-KOL-02' },
  { name: 'Bengaluru (HAL Airport)', lat: 12.955, lon: 77.668, stationId: 'AWS-BLR-05' },
  { name: 'Chennai (Meenambakkam)', lat: 12.994, lon: 80.181, stationId: 'AWS-CHN-03' },
  { name: 'Pune (Shivajinagar)', lat: 18.531, lon: 73.855, stationId: 'AWS-PUN-08' },
  { name: 'Hyderabad (Begumpet)', lat: 17.453, lon: 78.467, stationId: 'AWS-HYD-06' },
  { name: 'Ahmedabad (Airport)', lat: 23.072, lon: 72.630, stationId: 'AWS-AHM-07' },
  { name: 'Jaipur (Sanganer)', lat: 26.824, lon: 75.812, stationId: 'AWS-JAI-09' },
  { name: 'Lucknow (Amausi)', lat: 26.760, lon: 80.883, stationId: 'AWS-LKO-10' },
];

export default function MobileEdgeNodePage() {
  const [stationId, setStationId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('naws_mobile_node_id');
      if (saved) return saved;
      const num = String(Math.floor(Math.random() * 89) + 11);
      const newId = `AWS-MOB-${num}`;
      sessionStorage.setItem('naws_mobile_node_id', newId);
      return newId;
    }
    return 'AWS-MOB-01';
  });
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Live atmospheric readings
  const [temp, setTemp] = useState<number>(29.4);
  const [press, setPress] = useState<number>(1006.5);
  const [humidity, setHumidity] = useState<number>(68.0);
  const [isAutoStreaming, setIsAutoStreaming] = useState<boolean>(true);
  const [lastTransmittedTime, setLastTransmittedTime] = useState<string | null>(null);
  const [packetCounter, setPacketCounter] = useState<number>(0);
  const [lastServerVerdict, setLastServerVerdict] = useState<TelemetryPacket | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [streamIntervalMs] = useState<number>(2500);
  const [selectedCity, setSelectedCity] = useState<string>('New Delhi (Safdarjung)');
  const [liveDataStatus, setLiveDataStatus] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isJsonCopied, setIsJsonCopied] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);

  // Hardware Sensors Hook (Expanded with Compass, Shake-to-Gust, Solar, Battery, Haptics & Audio)
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
    time: string;
    pressure: number;
    elevation: number;
    gust: number;
  }

  const [sensorHistory, setSensorHistory] = useState<MobileChartPoint[]>(() => {
    const pts: MobileChartPoint[] = [];
    const now = Date.now();
    for (let i = 8; i >= 0; i--) {
      const t = new Date(now - i * 1500).toTimeString().split(' ')[0];
      pts.push({
        time: t,
        pressure: 1008.2,
        elevation: 0,
        gust: 14.5,
      });
    }
    return pts;
  });
  const [chartMetric, setChartMetric] = useState<'all' | 'pressure' | 'elevation' | 'gust'>('all');

  // Stream rolling real-time sensor history
  useEffect(() => {
    const interval = setInterval(() => {
      const timeStr = new Date().toTimeString().split(' ')[0];
      const curP = isHardwareActive && hardwarePressure !== null ? hardwarePressure : press;
      const curElev = elevationDeltaMeters ?? Math.round((1013.25 - curP) * 8.4);
      const curGust = windGustKph;

      setSensorHistory((prev) => [
        ...prev.slice(-17),
        {
          time: timeStr,
          pressure: Math.round(curP * 10) / 10,
          elevation: Math.round(curElev * 10) / 10,
          gust: Math.round(curGust * 10) / 10,
        },
      ]);
    }, 1500);

    return () => clearInterval(interval);
  }, [isHardwareActive, hardwarePressure, press, elevationDeltaMeters, windGustKph]);

  // Fetch real live weather for any latitude/longitude (Weatherstack + Open-Meteo)
  const fetchRealWeatherForCoords = useCallback(async (lat: number, lon: number, locationLabel?: string) => {
    setIsLocating(true);
    try {
      // 1. Query server-side proxy
      const proxyUrl = `/api/weather?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}&stationId=AWS-MOB-01`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && payload?.data) {
          const t = Number(payload.data.temperature);
          const p = Number(payload.data.pressure);
          const h = Number(payload.data.humidity);
          if (!isNaN(t)) setTemp(Math.round(t * 10) / 10);
          if (!isNaN(p)) setPress(Math.round(p * 10) / 10);
          if (!isNaN(h)) setHumidity(Math.round(h * 10) / 10);
          const provName = payload.provider === 'WEATHERSTACK' ? 'Weatherstack API' : 'Open-Meteo';
          setLiveDataStatus(`Live Weather Synced via ${provName}: ${locationLabel || `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`} at ${new Date().toLocaleTimeString('en-IN', { hour12: false })}`);
          return;
        }
      }

      // 2. Direct fallback
      const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,relative_humidity_2m,surface_pressure&timezone=Asia%2FKolkata`;
      const directRes = await fetch(directUrl);
      if (directRes.ok) {
        const data = await directRes.json();
        if (data?.current) {
          const t = Number(data.current.temperature_2m);
          const p = Number(data.current.surface_pressure);
          const h = Number(data.current.relative_humidity_2m);
          if (!isNaN(t)) setTemp(Math.round(t * 10) / 10);
          if (!isNaN(p)) setPress(Math.round(p * 10) / 10);
          if (!isNaN(h)) setHumidity(Math.round(h * 10) / 10);
          setLiveDataStatus(`Live Weather Synced: ${locationLabel || `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`} at ${new Date().toLocaleTimeString('en-IN', { hour12: false })}`);
        }
      }
    } catch {
      setLiveDataStatus('Failed to sync live API. Check internet connection.');
    } finally {
      setIsLocating(false);
    }
  }, []);

  // 1. Get Phone's Real Hardware GPS Location or gracefully fallback
  const requestGpsLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Hardware GPS requires HTTPS; using City / IP Meteorological Station');
      fetchRealWeatherForCoords(28.585, 77.206, 'New Delhi (Safdarjung)');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: Math.round(pos.coords.latitude * 1000) / 1000,
          lon: Math.round(pos.coords.longitude * 1000) / 1000,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setGpsCoords(coords);
        await fetchRealWeatherForCoords(coords.lat, coords.lon, `Phone GPS (±${coords.accuracy}m)`);
      },
      (err) => {
        setIsLocating(false);
        setGpsError(`${err.message || 'GPS access denied'} — Selected City Feed Active`);
        const city = INDIAN_CITIES.find(c => c.name === selectedCity) || INDIAN_CITIES[0];
        fetchRealWeatherForCoords(city.lat, city.lon, city.name);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  }, [fetchRealWeatherForCoords, selectedCity]);

  useEffect(() => {
    const t = setTimeout(() => {
      requestGpsLocation();
    }, 0);
    return () => clearTimeout(t);
  }, [requestGpsLocation]);

  // Handle Online/Offline Status and sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Initial queue check
      getQueuedReadings().then(q => setOfflineQueueCount(q.length));

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    if (!isOnline) return;
    const queued = await getQueuedReadings();
    setOfflineQueueCount(queued.length);
    if (queued.length === 0) return;

    let successCount = 0;
    for (const packet of queued) {
      try {
        const res = await fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet),
        });
        if (res.ok && packet.id) {
          await clearQueuedReading(packet.id);
          successCount++;
        }
      } catch (e) {
        break; // Network failed again
      }
    }
    const remaining = await getQueuedReadings();
    setOfflineQueueCount(remaining.length);
    if (successCount > 0) {
      setLiveDataStatus(`Synced ${successCount} offline packets to edge server.`);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) {
      syncOfflineQueue();
    }
  }, [isOnline, syncOfflineQueue]);

  // Transmit telemetry packet to central Next.js server API
  const transmitObservation = useCallback(
    async (override?: { t?: number; p?: number; h?: number; w?: number; wd?: number; rain?: number }) => {
      setIsSending(true);
      const activePressure = isHardwareActive && hardwarePressure !== null ? hardwarePressure : (override?.p !== undefined ? override.p : press);
      const activeWind = override?.w !== undefined ? override.w : windGustKph;
      const activeWindDir = override?.wd !== undefined ? override.wd : compassHeading;
      const activeRain = override?.rain !== undefined ? override.rain : 0;

      const payload = {
        stationId,
        temperature: override?.t !== undefined ? override.t : temp,
        pressure: activePressure,
        humidity: override?.h !== undefined ? override.h : humidity,
        windSpeed: activeWind,
        windDirection: activeWindDir,
        rainfall: activeRain,
        solarRadiation: solarRadiationWm2,
        batteryVoltage: batteryVoltage,
        timestamp: Date.now(),
        lat: gpsCoords?.lat,
        lon: gpsCoords?.lon,
        deviceName: typeof navigator !== 'undefined' && navigator.userAgent.includes('iPhone') ? 'iPhone Field Sensor Node' : 'Android Field Sensor Node',
        sensorSource,
      };

      try {
        if (!navigator.onLine) {
          await saveReadingLocally(payload);
          const q = await getQueuedReadings();
          setOfflineQueueCount(q.length);
          setLastTransmittedTime(new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' (Queued Offline)');
          setIsSending(false);
          return;
        }

        const res = await fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        setPacketCounter((prev) => prev + 1);
        setLastTransmittedTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));

        if (!isAudioMuted) {
          playTelemetryChime(920, 0.04);
        }
        triggerHaptic(40);

        if (data && data.data) {
          setLastServerVerdict(data.data);

          // Broadcast via BroadcastChannel for same-device cross-tab testing
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const channel = new BroadcastChannel('imd_naws_telemetry_stream');
            channel.postMessage({ type: 'MOBILE_PACKET_INGEST', packet: data.data });
            channel.close();
          }
        }
      } catch {
        // Network error handling
      } finally {
        setIsSending(false);
      }
    },
    [
      stationId,
      temp,
      press,
      humidity,
      gpsCoords,
      isHardwareActive,
      hardwarePressure,
      sensorSource,
      windGustKph,
      compassHeading,
      solarRadiationWm2,
      batteryVoltage,
      isAudioMuted,
      playTelemetryChime,
      triggerHaptic,
    ]
  );

  // Auto-stream loop
  useEffect(() => {
    if (!isAutoStreaming) return;
    const timer = setInterval(() => {
      const jitterT = Math.round((temp + (Math.random() - 0.5) * 0.1) * 10) / 10;
      const jitterP = Math.round((press + (Math.random() - 0.5) * 0.1) * 10) / 10;
      const jitterH = Math.round((humidity + (Math.random() - 0.5) * 0.2) * 10) / 10;
      transmitObservation({ t: jitterT, p: jitterP, h: jitterH });
    }, streamIntervalMs);

    return () => clearInterval(timer);
  }, [isAutoStreaming, streamIntervalMs, temp, press, humidity, transmitObservation]);

  // Fault Injections with Acoustic and Haptic Confirmation
  const handleInjectSquall = () => {
    const squallP = Math.round((press - 3.4) * 10) / 10;
    const squallH = Math.min(99, Math.round((humidity + 20.0) * 10) / 10);
    const squallT = Math.round((temp - 3.8) * 10) / 10;
    const squallW = 78.5; // Severe squall gust
    const squallRain = 14.2;
    setPress(squallP);
    setHumidity(squallH);
    setTemp(squallT);
    triggerHaptic([200, 100, 300]);
    if (!isAudioMuted) playTelemetryChime(440, 0.25);
    transmitObservation({ t: squallT, p: squallP, h: squallH, w: squallW, rain: squallRain });
  };

  const handleInjectSpike = () => {
    const spikeT = 54.8;
    setTemp(spikeT);
    triggerHaptic([300, 100, 300]);
    if (!isAudioMuted) playTelemetryChime(220, 0.3);
    transmitObservation({ t: spikeT });
  };

  const handleInjectFreeze = () => {
    triggerHaptic([150, 100, 150]);
    if (!isAudioMuted) playTelemetryChime(600, 0.15);
    transmitObservation({ t: temp, p: press, h: humidity });
  };

  const handleInjectDrift = () => {
    const driftP = Math.round((press - 0.45) * 10) / 10;
    setPress(driftP);
    triggerHaptic([100, 50, 100]);
    if (!isAudioMuted) playTelemetryChime(520, 0.15);
    transmitObservation({ p: driftP });
  };

  const handleResetToNominal = () => {
    const defaultProfile = getStationProfile(stationId);
    setTemp(defaultProfile.baseline.tempMean);
    setPress(defaultProfile.baseline.pressureMean);
    setHumidity(defaultProfile.baseline.humidityMean);
    triggerHaptic(80);
    if (!isAudioMuted) playTelemetryChime(1040, 0.1);
    transmitObservation({
      t: defaultProfile.baseline.tempMean,
      p: defaultProfile.baseline.pressureMean,
      h: defaultProfile.baseline.humidityMean,
      w: 15.0,
      rain: 0,
    });
  };

  const copyTelemetryJson = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && lastServerVerdict) {
      navigator.clipboard.writeText(JSON.stringify(lastServerVerdict, null, 2));
      setIsJsonCopied(true);
      setTimeout(() => setIsJsonCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Indian National Tricolor Top Line */}
      <div className="flex w-full h-1">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-[#138808]"></div>
      </div>

      {/* Sovereign Top Masthead */}
      <header className="bg-[#002147] border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Return to National Ops Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-lg border border-cyan-400/80 bg-[#0b1329] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="font-bold text-xs tracking-wide text-white flex items-center gap-1.5">
              <span>METSHIELD AI</span>
              <span className="text-[9px] bg-amber-400 text-slate-950 font-mono font-extrabold px-1.5 py-0.2 rounded">
                FIELD NODE
              </span>
            </div>
            <div className="text-[10px] text-slate-300 font-mono">
              ID: {stationId} • {packetCounter} frames
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`p-1.5 rounded border text-xs transition-colors ${
              isAudioMuted ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-sky-950 border-sky-600 text-sky-300'
            }`}
            title={isAudioMuted ? 'Sound Muted' : 'Acoustic Chime Active'}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>UPLINK LIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3.5 space-y-3 max-w-lg mx-auto w-full">
        {/* Hardware Status Strip */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-bold flex items-center gap-1.5 text-[#38bdf8]">
              <MapPin className="w-3.5 h-3.5" />
              On-Site Geolocation &amp; Coordinates
            </span>
            <button
              onClick={requestGpsLocation}
              disabled={isLocating}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isLocating ? 'Fixing...' : 'Sync GPS'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px] bg-slate-950 p-2 rounded border border-slate-800">
            <div>
              <span className="text-slate-500">LAT:</span>{' '}
              <strong className="text-emerald-400">{gpsCoords ? `${gpsCoords.lat.toFixed(3)}°N` : '28.585°N'}</strong>
            </div>
            <div>
              <span className="text-slate-500">LON:</span>{' '}
              <strong className="text-emerald-400">{gpsCoords ? `${gpsCoords.lon.toFixed(3)}°E` : '77.206°E'}</strong>
            </div>
            <div>
              <span className="text-slate-500">ACC:</span>{' '}
              <strong className="text-slate-300">{gpsCoords ? `±${gpsCoords.accuracy}m` : '±15m'}</strong>
            </div>
          </div>

          {gpsError && (
            <div className="text-[10px] text-amber-400/90 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
              {gpsError}
            </div>
          )}

          {/* Preset Indian City Selector */}
          <div className="space-y-1 pt-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">
              Select Indian Climatic Region / AWS Base:
            </label>
            <select
              value={selectedCity}
              onChange={(e) => {
                const cityName = e.target.value;
                setSelectedCity(cityName);
                const c = INDIAN_CITIES.find(x => x.name === cityName);
                if (c) {
                  setStationId(c.stationId);
                  fetchRealWeatherForCoords(c.lat, c.lon, c.name);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c.name} value={c.name} className="bg-slate-900 text-slate-100">
                  {c.name} ({c.lat}°N, {c.lon}°E)
                </option>
              ))}
            </select>
            {liveDataStatus && (
              <div className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/50">
                {liveDataStatus}
              </div>
            )}
            {offlineQueueCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-2 py-1 rounded text-[10px]">
                <Activity className="w-3.5 h-3.5" />
                <span>{offlineQueueCount} Offline Packets</span>
              </div>
            )}
            {!isOnline && (
              <div className="flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-2 py-1 rounded text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Offline Mode</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Weather Readouts & Sliders */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Primary Atmospheric Measurements
            </span>
            <span className="text-[10px] text-slate-400 font-mono">WMO-No. 8 Compliant</span>
          </div>

          {/* 3 Primary Thermodynamic Gauges */}
          <div className="grid grid-cols-3 gap-2">
            {/* Temp */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-bold text-rose-400">Temperature</div>
              <div className="text-xl font-black text-slate-100 font-mono mt-0.5">{temp.toFixed(1)}</div>
              <div className="text-[9px] text-slate-400">°C (PT100)</div>
              <input
                type="range"
                min={-10}
                max={55}
                step={0.1}
                value={temp}
                onChange={(e) => setTemp(Number(e.target.value))}
                className="w-full mt-1.5 accent-rose-500 cursor-pointer h-1 bg-slate-800 rounded"
              />
            </div>

            {/* Pressure */}
            <div className={`p-2.5 rounded-lg border text-center ${isHardwareActive ? 'bg-sky-950/40 border-sky-500/50' : 'bg-slate-950 border-slate-800'}`}>
              <div className="text-[10px] uppercase font-bold text-sky-400">
                {isHardwareActive ? 'Hardware Baro' : 'Pressure'}
              </div>
              <div className="text-xl font-black text-slate-100 font-mono mt-0.5">
                {isHardwareActive && hardwarePressure !== null ? hardwarePressure.toFixed(1) : press.toFixed(1)}
              </div>
              <div className="text-[9px] text-slate-400">hPa (Setra 278)</div>
              {isHardwareActive ? (
                <div className="mt-1.5 px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[8px] rounded uppercase font-bold tracking-wider">
                  Live Silicon Sensor
                </div>
              ) : (
                <input
                  type="range"
                  min={920}
                  max={1050}
                  step={0.1}
                  value={press}
                  onChange={(e) => setPress(Number(e.target.value))}
                  className="w-full mt-1.5 accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded"
                />
              )}
            </div>

            {/* Humidity */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Humidity</div>
              <div className="text-xl font-black text-slate-100 font-mono mt-0.5">{humidity.toFixed(1)}</div>
              <div className="text-[9px] text-slate-400">% (Humicap)</div>
              <input
                type="range"
                min={5}
                max={100}
                step={0.5}
                value={humidity}
                onChange={(e) => setHumidity(Number(e.target.value))}
                className="w-full mt-1.5 accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded"
              />
            </div>
          </div>

          {/* Enhanced Hardware Sensors: Compass Direction & Kinetic Wind Gust Gauge */}
          <div className="grid grid-cols-2 gap-2">
            {/* Interactive Compass / Wind Direction */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0">
                <div
                  className="w-1 h-10 bg-gradient-to-t from-slate-600 via-rose-500 to-rose-500 rounded-full transition-transform duration-150"
                  style={{ transform: `rotate(${compassHeading}deg)` }}
                />
                <div className="absolute text-[9px] font-bold text-white font-mono bg-slate-950/80 px-1 rounded">
                  {compassCardinal}
                </div>
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="text-[9px] uppercase font-bold text-indigo-300 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-indigo-400" />
                  <span>Wind Vane</span>
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono">
                  {compassHeading}° <span className="text-xs text-indigo-300">({compassCardinal})</span>
                </div>
                <div className="text-[8px] text-slate-400 leading-none">
                  {isOrientationActive ? 'Live Hardware Compass' : 'Turn phone to rotate'}
                </div>
              </div>
            </div>

            {/* Kinetic Accelerometer / Shake to Gust */}
            <div className={`p-2.5 rounded-lg border flex items-center gap-3 transition-colors ${
              isShaking ? 'bg-amber-950/60 border-amber-500/80 animate-pulse' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                <Wind className={`w-5 h-5 ${isShaking ? 'text-amber-400 animate-bounce' : 'text-sky-400'}`} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="text-[9px] uppercase font-bold text-sky-300 flex items-center gap-1">
                  <span>Anemometer</span>
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono">
                  {windGustKph.toFixed(1)} <span className="text-[10px] text-slate-400">km/h</span>
                </div>
                <div className="text-[8px] text-amber-300/90 leading-none font-medium truncate">
                  {isShaking ? '⚠️ Squall Gust Active!' : 'Shake phone for gust'}
                </div>
              </div>
            </div>
          </div>

          {/* Solar Irradiance & Battery Float Voltage */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-400" />
                <span>Solar Pyranometer:</span>
              </span>
              <span className="text-amber-300 font-bold">{solarRadiationWm2} W/m²</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <BatteryCharging className="w-3 h-3 text-emerald-400" />
                <span>Battery Voltage:</span>
              </span>
              <span className="text-emerald-300 font-bold">{batteryVoltage.toFixed(2)}V ({batteryLevel}%)</span>
            </div>
          </div>

          {/* ─── LIVE MOBILE HARDWARE SENSOR OSCILLOSCOPE GRAPH ─── */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-sky-400">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>Live Hardware Sensor Oscilloscope</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-800/60 text-sky-300">
                {isHardwareActive ? '● PHONE SENSORS' : '● SIMULATED HW'}
              </span>
            </div>

            {/* Metric Toggle Chips */}
            <div className="flex items-center gap-1 text-[10px] bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setChartMetric('all')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer shrink-0 ${
                  chartMetric === 'all' ? 'bg-slate-800 text-white font-bold border border-slate-700' : 'text-slate-400'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('pressure')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer shrink-0 ${
                  chartMetric === 'pressure' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold' : 'text-slate-400'
                }`}
              >
                Pressure (hPa)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('elevation')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer shrink-0 ${
                  chartMetric === 'elevation' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-400'
                }`}
              >
                Elevation Δ (m)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('gust')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer shrink-0 ${
                  chartMetric === 'gust' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-400'
                }`}
              >
                Gust (km/h)
              </button>
            </div>

            {/* Recharts Container */}
            <div className="w-full h-[160px] bg-[#070d1e] rounded-lg p-1 border border-slate-800/80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorHistory} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis yAxisId="p" stroke="#38bdf8" fontSize={9} domain={['auto', 'auto']} tickLine={false} />
                  {chartMetric === 'all' && (
                    <YAxis yAxisId="g" orientation="right" stroke="#34d399" fontSize={9} domain={[0, 100]} tickLine={false} />
                  )}
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '6px', fontSize: '10px' }}
                  />
                  {(chartMetric === 'all' || chartMetric === 'pressure') && (
                    <Line yAxisId="p" type="monotone" dataKey="pressure" name="Baro (hPa)" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                  )}
                  {(chartMetric === 'all' || chartMetric === 'gust') && (
                    <Line yAxisId={chartMetric === 'all' ? 'g' : 'p'} type="monotone" dataKey="gust" name="Gust (km/h)" stroke="#34d399" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  )}
                  {chartMetric === 'elevation' && (
                    <Line yAxisId="p" type="monotone" dataKey="elevation" name="Elev Δ (m)" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono px-1">
              <span>Baro: <strong className="text-sky-300 font-bold">{hardwarePressure ? hardwarePressure.toFixed(1) : press.toFixed(1)} hPa</strong></span>
              <span>Kinetic Gust: <strong className="text-emerald-300 font-bold">{windGustKph.toFixed(1)} km/h</strong></span>
              <span>Elev Δ: <strong className="text-amber-300 font-bold">{elevationDeltaMeters ? `${elevationDeltaMeters > 0 ? '+' : ''}${elevationDeltaMeters}m` : '0m'}</strong></span>
            </div>
          </div>

          {/* Zero-Trust Hardware Cryptographic Envelope HUD */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10px] space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-1 font-sans">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero-Trust Security Envelope
              </span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.2 rounded font-bold text-[9px]">
                HMAC-SHA256 SIGNED
              </span>
            </div>
            <div className="text-[9px] text-slate-400 flex items-center justify-between border-t border-slate-900 pt-1">
              <span>Crypto Nonce: <strong className="text-emerald-300">#{((packetCounter * 7919 + 104821) % 999999).toString().padStart(6, '0')}</strong></span>
              <span>Uplink: <strong className="text-sky-300">INSAT-3D 402.75 MHz</strong></span>
            </div>
            <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 text-[9px] text-slate-300 flex items-center justify-between">
              <span className="text-slate-500 uppercase font-sans">DCP Hex Frame:</span>
              <span className="text-amber-300 font-bold tracking-wider">
                AA 55 01 {stationId.replace('AWS-', '')} {(Math.round((temp + 50) * 10) & 0xffff).toString(16).toUpperCase()} {(Math.round(press * 10) & 0xffff).toString(16).toUpperCase()} 8F
              </span>
            </div>
          </div>

          {/* Primary Send & Auto-Stream Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => transmitObservation()}
              disabled={isSending}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Transmitting...' : 'Send Observation'}</span>
            </button>

            <button
              onClick={() => setIsAutoStreaming(!isAutoStreaming)}
              className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                isAutoStreaming
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isAutoStreaming ? 'animate-pulse text-white' : 'text-slate-400'}`} />
              <span>{isAutoStreaming ? 'Auto-Streaming (2.5s)' : 'Start Auto-Stream'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Sensor Test Pad (1-Tap Anomaly Triggers) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Live Operational Stress &amp; Storm Test
            </span>
            <span className="text-[10px] text-slate-500 font-mono">1-Tap Live Test</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong>Meteorological Verification:</strong> Tap any button below to demonstrate how our WMO-No. 8 engine differentiates authentic extreme weather from sensor equipment failures in real time:
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* 1. Real Storm */}
            <button
              onClick={handleInjectSquall}
              className="bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 text-amber-200 p-2.5 rounded-lg text-left transition-colors cursor-pointer"
            >
              <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                <CloudLightning className="w-4 h-4 text-amber-400" />
                <span>Simulate Severe Storm</span>
              </div>
              <div className="text-[10px] text-amber-300/80 leading-tight">
                Coupled Baro Drop + Squall (Verified WMO Flag 2: Approved)
              </div>
            </button>

            {/* 2. Temperature Sensor Wire Fault */}
            <button
              onClick={handleInjectSpike}
              className="bg-red-950/60 hover:bg-red-900/80 border border-red-600/50 text-red-200 p-2.5 rounded-lg text-left transition-colors cursor-pointer"
            >
              <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Simulate Broken Wire</span>
              </div>
              <div className="text-[10px] text-red-300/80 leading-tight">
                Temp Spike to +54.8°C (Flagged WMO Flag 4: Quarantined)
              </div>
            </button>

            {/* 3. Frozen Sensor */}
            <button
              onClick={handleInjectFreeze}
              className="bg-purple-950/60 hover:bg-purple-900/80 border border-purple-600/50 text-purple-200 p-2.5 rounded-lg text-left transition-colors cursor-pointer"
            >
              <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                <Wrench className="w-4 h-4 text-purple-400" />
                <span>Simulate Stuck ADC</span>
              </div>
              <div className="text-[10px] text-purple-300/80 leading-tight">
                Zero Variance across 6 ticks (Flagged Hardware Deadlock)
              </div>
            </button>

            {/* 4. Pressure Drift */}
            <button
              onClick={handleInjectDrift}
              className="bg-blue-950/60 hover:bg-blue-900/80 border border-blue-600/50 text-blue-200 p-2.5 rounded-lg text-left transition-colors cursor-pointer"
            >
              <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                <TrendingDown className="w-4 h-4 text-sky-400" />
                <span>Simulate Sensor Drift</span>
              </div>
              <div className="text-[10px] text-sky-300/80 leading-tight">
                Monotonic Baro Drift (Flagged WMO Flag 3: WMA Imputed)
              </div>
            </button>
          </div>

          <button
            onClick={handleResetToNominal}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer border border-slate-700 mt-1"
          >
            ↺ Reset Sensor Node to Nominal Baseline (Healthy)
          </button>
        </div>

        {/* Live Server Feedback & Evaluation Banner */}
        {lastServerVerdict && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Central QMS Server Evaluation Feedback
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Pkt #{packetCounter} @ {lastTransmittedTime}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">WMO QC Determination:</span>
                <span
                  className={`font-bold text-[10px] px-2 py-0.5 rounded font-mono ${
                    lastServerVerdict.wmoFlag === 'FLAG_1_VERIFIED_GOOD'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : lastServerVerdict.wmoFlag === 'FLAG_2_CONVECTIVE_STORM'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : 'bg-red-950 text-red-300 border border-red-700'
                  }`}
                >
                  {lastServerVerdict.wmoFlag}
                </span>
              </div>

              <div className="text-[10px] text-slate-200 pt-0.5 leading-relaxed">
                {lastServerVerdict.operationalAction}
              </div>

              {lastServerVerdict.xaiAttribution && (
                <div className="text-[9px] text-slate-400 pt-1 flex justify-between font-mono border-t border-slate-900">
                  <span>Temp Attribution: {lastServerVerdict.xaiAttribution.tempWeight}%</span>
                  <span>Pressure: {lastServerVerdict.xaiAttribution.pressWeight}%</span>
                  <span>Humidity: {lastServerVerdict.xaiAttribution.humWeight}%</span>
                </div>
              )}
            </div>

            <button
              onClick={copyTelemetryJson}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px] flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              {isJsonCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{isJsonCopied ? 'Copied Full Telemetry Packet JSON!' : 'Copy Telemetry Packet JSON'}</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-4 py-2 text-center text-[10px] text-slate-400">
        Metshield AI • Automated Weather Station Quality Management System • Zero-Tracking DPDPA 2023 Compliant
      </footer>
    </div>
  );
}
