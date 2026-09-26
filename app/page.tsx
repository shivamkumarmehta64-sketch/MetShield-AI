'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Activity, Thermometer, Gauge, Droplets, AlertTriangle, ShieldCheck, Download, Wrench
} from 'lucide-react';
import { useMobileSensors } from '@/hooks/useMobileSensors';
import { NICWMOAnomalyEngine } from '@/lib/anomalyLogic';

// A-, A, A+ GIGW Font Sizes
const FONT_SIZES = ['text-sm', 'text-base', 'text-lg'];

interface HistoryItem {
  time: string;
  Temp: number;
  Pressure: number;
  Humidity: number;
}

interface IncidentItem {
  id: number;
  time: string;
  station: string;
  tag: string;
  action: string;
  xai: Record<string, number> | null;
  flag: string;
}

export default function MobileOptimizedJatayuPortal() {
  const [fontSizeLevel, setFontSizeLevel] = useState(1);
  const [isHindi, setIsHindi] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Real-time sensor states
  const { pressure: hardwarePressure, isHardwareActive } = useMobileSensors();

  // Simulated baseline (simulating AWS feed if hardware inactive)
  const [baseTemp, setBaseTemp] = useState(28.5);
  const [basePress, setBasePress] = useState(1013.25);
  const [baseHum, setBaseHum] = useState(65);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);

  const engine = useMemo(() => new NICWMOAnomalyEngine(), []);

  // Time-series updater
  useEffect(() => {
    const timer = setInterval(() => {
      // Small jitter
      const t = baseTemp + (Math.random() - 0.5) * 0.2;
      const h = Math.min(100, Math.max(0, baseHum + (Math.random() - 0.5) * 1.5));
      const p = (isHardwareActive && hardwarePressure) ? hardwarePressure : (basePress + (Math.random() - 0.5) * 0.5);

      const packet = engine.processIngestedObservation('AWS-MOB-1', t, p, h, Date.now(), 15, null, 0);

      setHistory(prev => {
        const newHist = [...prev, {
          time: new Date().toISOString().slice(11, 19),
          Temp: Math.round(t * 10) / 10,
          Pressure: Math.round(p * 10) / 10,
          Humidity: Math.round(h * 10) / 10
        }];
        return newHist.slice(-29); // Sliding window
      });

      if (packet.classification !== 'NOMINAL_OPERATION') {
        setIncidents(prev => [{
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          station: packet.stationId,
          tag: packet.classification,
          action: packet.operationalAction,
          xai: packet.xaiAttribution,
          flag: packet.wmoFlag
        }, ...prev].slice(0, 10));
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [baseTemp, basePress, baseHum, hardwarePressure, isHardwareActive, engine]);

  // Actions
  const handleSpike = () => { setBaseTemp(55); setTimeout(() => setBaseTemp(28.5), 10000); };
  const handleFreeze = () => {
    setBaseTemp(28.5); setBasePress(1013.25); setBaseHum(65);
  };
  const handleStorm = () => { setBasePress(990); setBaseHum(99); setBaseTemp(20); setTimeout(() => {setBasePress(1013); setBaseHum(65); setBaseTemp(28.5)}, 15000); };

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "NIC/IMD Metadata Header - NAWS QMS\n"
      + "Timestamp,Station ID,Event,Action\n"
      + incidents.map(e => `${e.time},${e.station},${e.tag},"${e.action}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "QC_Audit_Log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fontSizeClass = FONT_SIZES[fontSizeLevel];

  // Safely grab the latest values
  const currentTemp = history.length > 0 ? history[history.length - 1].Temp : '--';
  const currentPress = history.length > 0 ? history[history.length - 1].Pressure : '--';
  const currentHum = history.length > 0 ? history[history.length - 1].Humidity : '--';

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${fontSizeClass} flex flex-col font-sans pb-20`}>
      {/* 1. Header Bar (Sticky, Mobile Optimized) */}
      <header className="bg-white border-b border-slate-200 shadow-sm z-10 sticky top-0 pb-safe-top">
        <div className="flex w-full h-1">
          <div className="flex-1 bg-orange-500" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-green-600" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-3">
          <div>
            <h1 className="font-black tracking-tight text-slate-800 text-sm md:text-base leading-tight">
              {isHindi ? 'भारत सरकार | पृथ्वी विज्ञान मंत्रालय' : 'GOVT OF INDIA | MOES'}
            </h1>
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1.5 flex-wrap">
              JATAYU NAWS-QMS v4.2
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] animate-pulse whitespace-nowrap">
                ● LIVE (2.5s DCP)
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200 self-start sm:self-auto shrink-0">
            <button onClick={() => setFontSizeLevel(Math.max(0, fontSizeLevel - 1))} className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 shadow-sm min-touch text-xs font-bold active:scale-95 transition-transform">A-</button>
            <button onClick={() => setFontSizeLevel(1)} className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 shadow-sm min-touch text-xs font-bold active:scale-95 transition-transform">A</button>
            <button onClick={() => setFontSizeLevel(Math.min(2, fontSizeLevel + 1))} className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 shadow-sm min-touch text-xs font-bold active:scale-95 transition-transform">A+</button>
            <div className="w-px h-5 bg-slate-300 mx-1"></div>
            <button onClick={() => setIsHindi(!isHindi)} className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 shadow-sm min-touch text-xs font-bold active:scale-95 transition-transform">
              {isHindi ? 'EN' : 'हि'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 flex flex-col gap-5">

        {/* 2. Hero Telemetry Strip (Horizontal Scroll on Mobile) */}
        <div className="-mx-4 px-4 overflow-x-auto hide-scrollbar">
          <div className="flex gap-3 min-w-max pb-2 snap-x snap-mandatory">
            {/* Temp Card */}
            <div className="snap-start shrink-0 w-40 bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Temperature</div>
              </div>
              <div className="text-2xl font-black text-slate-800 tracking-tight">
                {currentTemp}°C
              </div>
            </div>

            {/* Pressure Card */}
            <div className="snap-start shrink-0 w-44 bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 flex flex-col gap-2 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-50 text-sky-500 rounded-lg">
                  <Gauge className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Atmos<br/>Pressure</div>
              </div>
              <div className="text-2xl font-black text-slate-800 tracking-tight">
                {currentPress} hPa
              </div>
              <div className={`absolute top-0 right-0 rounded-bl-lg px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm ${isHardwareActive ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                {isHardwareActive ? '● MOB HDWR' : '● SIM'}
              </div>
            </div>

            {/* Humidity Card */}
            <div className="snap-start shrink-0 w-40 bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                  <Droplets className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Rel<br/>Humidity</div>
              </div>
              <div className="text-2xl font-black text-slate-800 tracking-tight">
                {currentHum}%
              </div>
            </div>
          </div>
        </div>

        {/* 3. Real-time WMO Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 flex flex-col">
          <h3 className="font-bold text-slate-800 flex items-center gap-1.5 mb-3 text-sm border-b border-slate-100 pb-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            Telemetry Stream
          </h3>
          {/* Reduced height for mobile */}
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} tick={{fill: '#94a3b8'}} tickMargin={8} minTickGap={20} />
                <YAxis stroke="#94a3b8" fontSize={9} domain={['auto', 'auto']} tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '8px 12px' }}
                  itemStyle={{ padding: 0 }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" iconSize={6} />
                <Line type="monotone" dataKey="Temp" stroke="#f43f5e" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Pressure" stroke="#0ea5e9" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Incident Stream (Natural Scroll) */}
        <div className="bg-slate-900 rounded-2xl shadow-md border border-slate-800 p-3.5 text-white flex flex-col flex-1">
          <h3 className="font-bold text-slate-100 flex items-center justify-between mb-3 border-b border-slate-800 pb-2 text-sm">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Incident Stream
            </span>
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-400">
              LIVE
            </span>
          </h3>

          <div className="flex flex-col gap-2.5">
            {incidents.length === 0 ? (
              <div className="text-slate-500 text-center py-8 text-sm font-medium flex flex-col items-center">
                <ShieldCheck className="w-8 h-8 text-emerald-500/30 mb-2" />
                No anomalies detected. Network nominal.
              </div>
            ) : (
              incidents.slice(0, 5).map(inc => { // Show max 5 on mobile feed to keep it clean, user can scroll if we let it unbounded but 5 is great
                const isStorm = inc.tag.includes('STORM') || inc.tag.includes('GENUINE');
                return (
                  <div key={inc.id} className={`p-3 rounded-xl border text-xs ${isStorm ? 'bg-cyan-950/40 border-cyan-800/50' : 'bg-rose-950/40 border-rose-800/50'}`}>
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <span className="font-mono text-slate-400 text-[9px] break-all">{inc.time} · {inc.station}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shrink-0 ${isStorm ? 'bg-cyan-900/80 text-cyan-300' : 'bg-rose-900/80 text-rose-300'}`}>
                        {inc.tag}
                      </span>
                    </div>
                    <div className="font-medium text-slate-200 mb-2 leading-relaxed text-[13px]">
                      {inc.action}
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/50">
                      <div className="text-[9px] font-mono text-slate-500">
                        {inc.flag}
                      </div>
                      {inc.xai && (
                        <div className="flex items-center gap-1 opacity-70">
                          {['temp', 'press', 'hum'].map(k => (
                            <div key={k} className="h-1.5 w-5 bg-slate-800 rounded-full overflow-hidden flex">
                              <div className={`${isStorm ? 'bg-cyan-500' : 'bg-rose-500'}`} style={{width: `${Math.abs(inc.xai[`${k}Weight` as keyof typeof inc.xai] || 0) * 100}%`}}></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </main>

      {/* 5. iOS-style Bottom Sheet for Diagnostics */}
      {/* Overlay to catch clicks when open */}
      <div
        className={`fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900 text-slate-300 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-transform duration-300 z-50 pb-safe ${isDrawerOpen ? 'translate-y-0' : 'translate-y-full'}`}>

        {/* Floating FAB trigger when closed, Handle when open */}
        <div className="absolute left-0 right-0 -top-14 flex justify-center pointer-events-none">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="pointer-events-auto bg-slate-900 text-slate-300 border-2 border-indigo-500/50 rounded-full px-5 py-2.5 font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl min-touch active:scale-95"
          >
            <Wrench className="w-4 h-4 text-indigo-400" />
            <span>Diagnostics</span>
          </button>
        </div>

        <div className="p-5 sm:p-6 max-w-3xl mx-auto w-full">
          {/* Visual drag handle */}
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-5 opacity-50" />

          <div className="flex flex-col gap-4 mb-5">
            <div>
              <h4 className="font-bold text-white text-base">Bench Injection Tool</h4>
              <p className="text-xs text-slate-400 mt-0.5">Trigger edge scenarios locally without deploying external hardware rigs.</p>
            </div>
            <button onClick={exportCSV} className="min-touch bg-emerald-700/80 hover:bg-emerald-600 text-white px-4 py-3 text-center rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 border border-emerald-500/30">
              <Download className="w-4 h-4" /> Export QC Audit Log (.csv)
            </button>
          </div>

          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3">
            <button onClick={() => { handleSpike(); setIsDrawerOpen(false); }} className="min-touch bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl p-3.5 text-left transition-colors group active:scale-95">
              <span className="block font-bold text-rose-400 text-sm mb-1 group-hover:text-rose-300">Simulate T-Spike</span>
              <span className="block text-[10px] text-slate-400 font-mono leading-tight">Open-circuit fault (Temp → 55°C)</span>
            </button>
            <button onClick={() => { handleFreeze(); setIsDrawerOpen(false); }} className="min-touch bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl p-3.5 text-left transition-colors group active:scale-95">
              <span className="block font-bold text-amber-400 text-sm mb-1 group-hover:text-amber-300">Simulate Float Lock</span>
              <span className="block text-[10px] text-slate-400 font-mono leading-tight">Sensor freeze (Rigid stable values)</span>
            </button>
            <button onClick={() => { handleStorm(); setIsDrawerOpen(false); }} className="min-touch bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl p-3.5 text-left transition-colors group active:scale-95">
              <span className="block font-bold text-cyan-400 text-sm mb-1 group-hover:text-cyan-300">Simulate Storm Front</span>
              <span className="block text-[10px] text-slate-400 font-mono leading-tight">Coupled T↓ P↓ RH↑ pattern</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
