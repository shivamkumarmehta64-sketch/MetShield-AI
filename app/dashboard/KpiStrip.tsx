'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Gauge, Radio, ShieldCheck } from 'lucide-react';
import { computeKpis, type NetworkKpis } from '@/lib/networkFeed';
import { useSystem } from './SystemContext';

export type Tone = 'healthy' | 'warning' | 'weather' | 'fault' | 'telemetry' | 'neutral';

export interface Verdict {
  tone: Tone;
  headline: string;
  detail: string;
  faultStations: string[];
}

export function computeVerdict(k: NetworkKpis, faultStations: string[]): Verdict {
  if (k.activeFaults > 0) {
    return {
      tone: 'fault',
      headline: `${k.activeFaults === 1 ? '1 STATION REPORTS HARDWARE FAULT' : `${k.activeFaults} STATIONS REPORT HARDWARE FAULT`}`,
      detail: `${faultStations.join(' · ')} — transducer fault, not weather.`,
      faultStations,
    };
  }
  if (k.activeAnomalies === 0) {
    return {
      tone: 'healthy',
      headline: 'NETWORK NOMINAL',
      detail: `All ${k.total} registered stations at WMO Flag 1.`,
      faultStations: [],
    };
  }
  const parts: string[] = [];
  if (k.weatherEvents > 0) parts.push(`${k.weatherEvents} convective storm`);
  if (k.drift > 0) parts.push(`${k.drift} sensor drift`);
  if (k.telemetryIssues > 0) parts.push(`${k.telemetryIssues} packet loss`);
  return {
    tone: 'warning',
    headline: `${k.activeAnomalies === 1 ? '1 STATION NEEDS ATTENTION' : `${k.activeAnomalies} STATIONS NEED ATTENTION`}`,
    detail: `${parts.join(' · ')}.`,
    faultStations: [],
  };
}

export default function KpiStrip() {
  const { state } = useSystem();
  const snapshot = state.snapshot;
  const k = useMemo(() => computeKpis(snapshot), [snapshot]);

  // Derived values for the 6 KPIs based on real data
  const total = k.total;
  const nominal = k.nominal;
  const watch = k.drift + k.telemetryIssues;
  const fault = k.activeFaults;
  const weather = k.weatherEvents;

  const pct = (val: number) => total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';

  return (
    <section aria-label="Network key figures" className="flex flex-col gap-4">
      <div>
        <h1 className="t-page-title text-navy text-[22px]">AWS Network Overview</h1>
        <p className="t-body text-ink-muted mt-1">
          {snapshot.dataMode === 'LIVE'
            ? 'Live Open-Meteo surface NWP observations across 21 IMD station coordinates (QNH reduced)'
            : 'Operational view of benchmark station network'}
        </p>
      </div>

      {/* Phones get one strip, not six cards.
          The card grid costs ~450px before a single station row appears, and
          four of the six numbers are usually zero — the most common value on
          the screen was "0", three times, each in its own 150px card. The grid
          returns at `sm`, where there is room for it. */}
      <div className="sm:hidden card rounded-2xl overflow-hidden flex items-stretch shadow-xs">
        {([
          ['Stations', total, 'text-ink'],
          ['Nominal', nominal, 'text-healthy-text'],
          ['Watch', watch, 'text-warning-text'],
          ['Fault', fault, 'text-fault-text'],
        ] as const).map(([label, value, tone]) => (
          <div key={label} className="flex-1 px-2 py-3 text-center border-r border-hairline last:border-r-0">
            <div className={`t-mono text-[20px] font-bold leading-none ${tone}`}>{value}</div>
            <div className="t-meta text-[11px] text-ink-muted mt-1.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="hidden sm:grid grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Stations */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28, delay: 0.02 }}
          className="card rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-full bg-telemetry-bg flex items-center justify-center text-telemetry mb-1">
            <Radio size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{total}</div>
          <div className="t-meta text-ink-muted">Total Stations</div>
        </motion.div>

        {/* 2. Nominal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28, delay: 0.05 }}
          className="card rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 relative shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-healthy"></div>
          <div className="w-10 h-10 rounded-full bg-healthy-bg flex items-center justify-center text-healthy mb-1">
            <ShieldCheck size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{nominal}</div>
          <div className="t-meta text-ink-muted">Nominal</div>
          <div className="text-[11px] font-mono text-healthy font-semibold">{pct(nominal)}</div>
        </motion.div>

        {/* 3. Watch */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28, delay: 0.08 }}
          className="card rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 relative shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-warning"></div>
          <div className="w-10 h-10 rounded-full bg-warning-bg flex items-center justify-center text-warning mb-1">
            <AlertTriangle size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{watch}</div>
          <div className="t-meta text-ink-muted">Watch</div>
          <div className="text-[11px] font-mono text-warning-text font-semibold">{pct(watch)}</div>
        </motion.div>

        {/* 4. Fault */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28, delay: 0.11 }}
          className="card rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 relative shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-fault"></div>
          <div className="w-10 h-10 rounded-full bg-fault-bg flex items-center justify-center text-fault mb-1">
            <Activity size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{fault}</div>
          <div className="t-meta text-ink-muted">Fault</div>
          <div className="text-[11px] font-mono text-fault-text font-semibold">{pct(fault)}</div>
        </motion.div>

        {/* 5. Weather Event */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28, delay: 0.14 }}
          className="card rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 relative shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-weather"></div>
          <div className="w-10 h-10 rounded-full bg-weather-bg flex items-center justify-center text-weather mb-1">
            <Activity size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{weather}</div>
          <div className="t-meta text-ink-muted">Weather Event</div>
          <div className="text-[11px] font-mono text-weather-text font-semibold">{pct(weather)}</div>
        </motion.div>

        {/* 6. Channels */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28, delay: 0.17 }}
          className="card rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 shadow-xs hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-full bg-telemetry-bg flex items-center justify-center text-telemetry mb-1">
            <Gauge size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">5</div>
          <div className="t-meta text-ink-muted">Channels</div>
          <div className="text-[10px] text-ink-faint">T, P, RH, Wind, Rain</div>
        </motion.div>
      </div>
    </section>
  );
}
