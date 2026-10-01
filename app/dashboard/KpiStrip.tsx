'use client';

import { useMemo } from 'react';
import { Activity, AlertTriangle, Gauge, Radio, ShieldCheck } from 'lucide-react';
import { computeKpis, getNetworkSnapshot, type NetworkKpis } from '@/lib/networkFeed';

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
      headline: `${k.activeFaults} STATION${k.activeFaults === 1 ? '' : 'S'} REPORT HARDWARE FAULT`,
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
    headline: `${k.activeAnomalies} STATION${k.activeAnomalies === 1 ? '' : 'S'} NEED ATTENTION`,
    detail: `${parts.join(' · ')}.`,
    faultStations: [],
  };
}

export default function KpiStrip() {
  const snapshot = getNetworkSnapshot();
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
        <p className="t-body text-ink-muted mt-1">Operational view of benchmark station network</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Stations */}
        <div className="card p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-sky-deep mb-1">
            <Radio size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{total}</div>
          <div className="t-meta text-ink-muted">Total Stations</div>
        </div>

        {/* 2. Nominal */}
        <div className="card p-4 flex flex-col items-center justify-center text-center gap-2 relative">
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-healthy"></div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-healthy mb-1">
            <ShieldCheck size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{nominal}</div>
          <div className="t-meta text-ink-muted">Nominal</div>
          <div className="text-[11px] font-mono text-healthy font-semibold">{pct(nominal)}</div>
        </div>

        {/* 3. Watch */}
        <div className="card p-4 flex flex-col items-center justify-center text-center gap-2 relative">
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-warning"></div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-warning mb-1">
            <AlertTriangle size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{watch}</div>
          <div className="t-meta text-ink-muted">Watch</div>
          <div className="text-[11px] font-mono text-warning font-semibold">{pct(watch)}</div>
        </div>

        {/* 4. Fault */}
        <div className="card p-4 flex flex-col items-center justify-center text-center gap-2 relative">
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-fault"></div>
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-fault mb-1">
            <Activity size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{fault}</div>
          <div className="t-meta text-ink-muted">Fault</div>
          <div className="text-[11px] font-mono text-fault font-semibold">{pct(fault)}</div>
        </div>

        {/* 5. Weather Event */}
        <div className="card p-4 flex flex-col items-center justify-center text-center gap-2 relative">
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-weather"></div>
          <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-weather mb-1">
            <Activity size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">{weather}</div>
          <div className="t-meta text-ink-muted">Weather Event</div>
          <div className="text-[11px] font-mono text-weather font-semibold">{pct(weather)}</div>
        </div>

        {/* 6. Channels */}
        <div className="card p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-ink-muted mb-1">
            <Gauge size={20} />
          </div>
          <div className="t-mono text-[22px] font-bold text-ink leading-none">5</div>
          <div className="t-meta text-ink-muted">Channels</div>
          <div className="text-[10px] text-ink-faint">T, P, RH, Wind, Rain</div>
        </div>
      </div>
    </section>
  );
}
