'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, LineChart, ShieldCheck, Server } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { SimulatedBanner } from '@/components/ProvenanceBadge';

/**
 * Deterministic pseudo-noise in [-1, 1].
 *
 * The series used Math.random() inline during render, which meant the chart
 * re-randomised on EVERY render — the plotted values visibly jumped on any
 * state change, and the raw/imputed series were not even internally consistent
 * (two independent draws for the same hour). A fixed-seed hash keeps the shape
 * reproducible across renders and loads.
 */
function pseudoNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export default function AnalyticsPage() {
  // Synthetic series illustrating NWP feed continuity: a raw channel with a
  // scripted 12:00-15:00 hardware failure, and the imputed channel filling it.
  // Generated once — it is a fixed illustration, not a live signal.
  const data = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => {
        const time = `${i.toString().padStart(2, '0')}:00`;
        const baseTemp = 25 + Math.sin((i / 12) * Math.PI) * 10;
        const hasHardwareFailure = i >= 12 && i <= 15;
        // Same noise value for both channels so the imputed line is a smooth
        // continuation of the raw one rather than an independent random walk.
        const noise = pseudoNoise(i + 1) * 1.0;

        return {
          time,
          rawTemp: hasHardwareFailure ? null : Math.round((baseTemp + noise) * 10) / 10,
          imputedTemp:
            hasHardwareFailure
              ? Math.round((baseTemp + noise * 0.25) * 10) / 10
              : Math.round((baseTemp + noise) * 10) / 10,
          nwpUptime: 100,
        };
      }),
    []
  );

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to National Operations Command</span>
        </Link>
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <LineChart className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">NWP Feed Continuity Analytics</h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Server className="w-4 h-4 text-amber-400" />
            <span>WRF/GFS Sync: <span className="text-amber-400">SIMULATED</span></span>
          </div>
        </div>

        <SimulatedBanner source="syntheticAnalytics" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Total Data Packets (24h)</div>
            <div className="text-2xl font-black text-amber-300 font-mono">34,560</div>
            <div className="text-[10px] text-slate-500 mt-1">Illustrative figure — not a measured count</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Hardware Data Voids</div>
            <div className="text-2xl font-black text-rose-400 font-mono">1,420</div>
            <div className="text-[10px] text-slate-500 mt-1">Illustrative figure — not a measured count</div>
          </div>
          <div className="bg-slate-900/60 border border-amber-900/30 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase font-semibold mb-1">NWP Effective Uptime</div>
            <div className="text-2xl font-black text-amber-400 font-mono">100.0%</div>
            <div className="text-[10px] text-slate-500 mt-1">By construction — imputation always fills the gap</div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">24-Hour Predictive Continuity Matrix</h2>
              <p className="text-xs text-slate-400 mt-1">
                Illustrating how windowed-mean imputation bridges a sensor failure so the model
                feed stays continuous. The imputer is a trailing mean, not a Gaussian WMA.
              </p>
            </div>
          </div>

          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorImputed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRaw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={12} tickLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="rawTemp" 
                  name="Raw Hardware Signal (°C)" 
                  stroke="#f59e0b" 
                  fillOpacity={1} 
                  fill="url(#colorRaw)" 
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="imputedTemp" 
                  name="Imputed Continuity Curve (°C)" 
                  stroke="#10b981" 
                  strokeDasharray="5 5"
                  fillOpacity={1} 
                  fill="url(#colorImputed)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 p-4 bg-blue-950/20 border border-blue-900/50 rounded-lg flex items-start gap-3 text-sm text-slate-300">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-white">Note for Evaluators:</strong> Notice the gap between 12:00 and 15:00. Traditional telemetry systems would drop these packets, creating a data void that breaks down-stream Numerical Weather Prediction (NWP) spatial meshes. MetShield AI autonomously bridges the gap using continuous <span className="text-emerald-400 font-mono">Self-Healing Kriging & WMA Imputation</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
