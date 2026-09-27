'use client';

import { useEffect, useState } from 'react';

interface Kpi {
  label: string;
  value: string;
  delta: string;
  deltaType: 'positive' | 'negative' | 'neutral';
  alert?: boolean;
}

const KPIS: Kpi[] = [
  { label: 'STATIONS ONLINE', value: '1,347', delta: '↑ 3 new', deltaType: 'positive' },
  { label: 'QC PASS RATE', value: '99.2%', delta: '↑ 0.1% vs 24h', deltaType: 'positive' },
  { label: 'ACTIVE INCIDENTS', value: '0', delta: '— stable', deltaType: 'neutral' },
  { label: 'DETECTION LAG', value: '<5ms', delta: '— within SLA', deltaType: 'neutral' },
];

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

export default function KpiStrip() {
  const stations = useCountUp(1347);

  return (
    <div
      className="grid grid-cols-4 border-b border-border-light"
      style={{ height: 80, background: '#0A0A0A' }}
    >
      {KPIS.map((kpi, i) => (
        <div
          key={kpi.label}
          className="flex flex-col justify-center gap-1"
          style={{
            padding: '0 20px',
            borderRight: i < 3 ? '1px solid #1E1E1E' : 'none',
            borderLeft: kpi.alert ? '2px solid #C0162C' : 'none',
          }}
        >
          <span className="font-mono uppercase" style={{ fontSize: 10, fontWeight: 500, color: '#2A2A2A', letterSpacing: '0.1em' }}>
            {kpi.label}
          </span>
          <span
            className="mpi-monospaced"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: kpi.alert ? '#C0162C' : '#FFFFFF',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {kpi.label === 'STATIONS ONLINE' ? stations.toLocaleString() : kpi.value}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: kpi.deltaType === 'positive' ? '#1A7A1A' : kpi.deltaType === 'negative' ? '#C0162C' : '#2A2A2A',
            }}
          >
            {kpi.delta}
          </span>
        </div>
      ))}
    </div>
  );
}
