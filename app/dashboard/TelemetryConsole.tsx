'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TelemetryPoint {
  t: number;
  temp: number;
  pressure: number;
  rh: number;
}

const WMO_RANGES = {
  temp: { min: -10, max: 55, unit: '°C', label: 'AMBIENT TEMPERATURE', wmo: 'WMO: -10°C to +55°C' },
  pressure: { min: 870, max: 1084, unit: 'hPa', label: 'PRESSURE', wmo: 'WMO: 870 to 1084 hPa' },
  rh: { min: 0, max: 100, unit: '%', label: 'RELATIVE HUMIDITY', wmo: 'WMO: 0 to 100 %' },
};

function generateTelemetry(count: number): TelemetryPoint[] {
  const data: TelemetryPoint[] = [];
  let temp = 32.4, pressure = 1008.2, rh = 58.0;
  for (let i = 0; i < count; i++) {
    temp += (Math.random() - 0.5) * 0.3;
    pressure += (Math.random() - 0.5) * 0.4;
    rh += (Math.random() - 0.5) * 0.8;
    temp = Math.max(-10, Math.min(55, temp));
    pressure = Math.max(870, Math.min(1084, pressure));
    rh = Math.max(0, Math.min(100, rh));
    data.push({ t: i, temp: +temp.toFixed(1), pressure: +pressure.toFixed(1), rh: +rh.toFixed(1) });
  }
  return data;
}

interface AnomalyEvent {
  timestamp: string;
  station: string;
  description: string;
  flag: string;
  severity: 'FLAG_4' | 'FLAG_3' | 'FLAG_5' | 'FLAG_2';
}

const ANOMALY_EVENTS: AnomalyEvent[] = [
  { timestamp: '09:41:33Z', station: 'AWS-HYD-06', description: 'Pressure spike +12hPa in 3 ticks — possible sensor drift', flag: 'FLAG-4 · CORRUPT_HARDWARE', severity: 'FLAG_4' },
  { timestamp: '09:38:12Z', station: 'AWS-CCU-02', description: 'Temperature step jump +4.2°C — WMO range check failed', flag: 'FLAG-3 · DRIFT', severity: 'FLAG_3' },
  { timestamp: '09:35:47Z', station: 'AWS-JAI-09', description: 'RH reading stuck at 42.3% for 8 consecutive packets', flag: 'FLAG-3 · STALE_VALUE', severity: 'FLAG_3' },
  { timestamp: '09:31:05Z', station: 'AWS-BHO-12', description: 'Packet loss detected — 3 consecutive missed cadences', flag: 'FLAG-5 · PACKET_LOSS', severity: 'FLAG_5' },
  { timestamp: '09:28:51Z', station: 'AWS-GAU-13', description: 'Convective activity detected — T/P/RH coupling anomaly', flag: 'FLAG-2 · STORM', severity: 'FLAG_2' },
  { timestamp: '09:22:18Z', station: 'AWS-AMD-07', description: 'Calibration drift — pressure offset +2.1hPa from baseline', flag: 'FLAG-3 · CALIBRATION', severity: 'FLAG_3' },
];

const SEVERITY_COLORS: Record<string, string> = {
  FLAG_4: '#C0162C',
  FLAG_3: '#7A5A00',
  FLAG_5: '#5A5A5A',
  FLAG_2: '#5588CC',
};

export default function TelemetryConsole() {
  const [packetCount, setPacketCount] = useState(12847);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(() => generateTelemetry(30));
  const [station, setStation] = useState('AWS-DEL-01');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPacketCount((c) => c + 1);
      setTelemetry((prev) => {
        const last = prev[prev.length - 1];
        const next: TelemetryPoint = {
          t: last.t + 1,
          temp: +(Math.max(-10, Math.min(55, last.temp + (Math.random() - 0.5) * 0.3))).toFixed(1),
          pressure: +(Math.max(870, Math.min(1084, last.pressure + (Math.random() - 0.5) * 0.4))).toFixed(1),
          rh: +(Math.max(0, Math.min(100, last.rh + (Math.random() - 0.5) * 0.8))).toFixed(1),
        };
        return [...prev.slice(1), next];
      });
    }, 2500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const latest = telemetry[telemetry.length - 1];

  const metrics = [
    { key: 'temp', value: latest.temp, ...WMO_RANGES.temp, color: '#C0162C', status: 'NOMINAL' },
    { key: 'pressure', value: latest.pressure, ...WMO_RANGES.pressure, color: '#FFFFFF', status: 'NOMINAL' },
    { key: 'rh', value: latest.rh, ...WMO_RANGES.rh, color: '#1A7A1A', status: 'NOMINAL' },
  ];

  return (
    <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 0 }}>
      {/* Console Header (FIX 8) */}
      <div className="flex items-center justify-between" style={{ height: 44, background: '#141414', borderBottom: '1px solid #1E1E1E', padding: '0 16px' }}>
        <div className="flex items-center gap-2">
          <span className="animate-pulse-dot" style={{ width: 6, height: 6, background: '#C0162C', borderRadius: '50%' }} />
          <span style={{ fontSize: 10, fontWeight: 500, fontFamily: 'var(--font-mono)', color: '#C0162C', textTransform: 'uppercase' }}>LIVE</span>
          <div style={{ width: 1, height: 12, background: '#2A2A2A' }} />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#3D3D3D' }}>INSAT-3DR · 2.5s</span>
        </div>
        <select
          value={station}
          onChange={(e) => setStation(e.target.value)}
          style={{
            background: '#141414', border: '1px solid #2A2A2A', padding: '4px 28px 4px 10px',
            fontSize: 10, fontFamily: 'var(--font-mono)', color: '#9A9A9A', width: 180, borderRadius: 0,
          }}
        >
          <option>AWS-DEL-01</option>
          <option>AWS-MUM-04</option>
          <option>AWS-CCU-02</option>
          <option>AWS-MAA-03</option>
          <option>AWS-BLR-05</option>
        </select>
      </div>

      {/* Packet Counter */}
      <div className="flex items-center gap-3" style={{ height: 28, background: '#141414', borderBottom: '1px solid #1E1E1E', padding: '0 16px' }}>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#2A2A2A', textTransform: 'uppercase' }}>PKT</span>
        <span className="mpi-monospaced" style={{ fontSize: 11, fontWeight: 600, color: '#5A5A5A' }}>{packetCount.toLocaleString()}</span>
        <span style={{ color: '#2A2A2A' }}>·</span>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#2A2A2A' }}>2.5s CADENCE</span>
      </div>

      {/* Three Metric Rows (FIX 7) */}
      {metrics.map((m) => {
        const pct = ((m.value - m.min) / (m.max - m.min)) * 100;
        const barColor = pct > 90 ? '#C0162C' : pct > 75 ? '#7A5A00' : '#1A7A1A';
        return (
          <div key={m.key} className="flex items-center justify-between" style={{ height: 72, borderBottom: '1px solid #1E1E1E', padding: '0 16px', position: 'relative' }}>
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 9, fontWeight: 500, fontFamily: 'var(--font-mono)', color: '#2A2A2A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {m.label}
              </span>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#1E1E1E' }}>{m.wmo}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="mpi-monospaced" style={{ fontSize: 40, fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                {m.value.toFixed(1)}
              </span>
              <span className="mpi-monospaced" style={{ fontSize: 16, fontWeight: 400, color: '#3D3D3D', alignSelf: 'flex-end', paddingBottom: 4 }}>
                {m.unit}
              </span>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#1E1E1E' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: barColor }} />
            </div>
          </div>
        );
      })}

      {/* Thermodynamic Status (FIX 9) */}
      <div className="flex items-center gap-3" style={{ height: 36, background: '#0A0A0A', borderTop: '1px solid #1E1E1E', borderBottom: '1px solid #1E1E1E', padding: '0 16px' }}>
        <span style={{ width: 6, height: 6, background: '#1A7A1A' }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#5A5A5A' }}>
          {station}: Tri-parameter coupling nominal. All probes stable.
        </span>
      </div>

      {/* Sparkline Chart (FIX 10) */}
      <div style={{ height: 120, background: '#0A0A0A', padding: '12px 16px 8px' }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#2A2A2A', textTransform: 'uppercase' }}>
            MULTI-PARAMETER CURVE · 30 TICKS · 2.5s
          </span>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#C0162C' }}>━ T</span>
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#5A5A5A' }}>━ P</span>
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#3D3D3D' }}>━ RH</span>
          </div>
        </div>
        <div style={{ height: 90, marginTop: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                contentStyle={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 0, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}
                labelStyle={{ color: '#5A5A5A' }}
              />
              <Line type="monotone" dataKey="temp" stroke="#C0162C" strokeWidth={1} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="pressure" stroke="#FFFFFF" strokeWidth={1} dot={false} isAnimationActive={false} opacity={0.4} />
              <Line type="monotone" dataKey="rh" stroke="#1A7A1A" strokeWidth={1} dot={false} isAnimationActive={false} opacity={0.6} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Anomaly Event Feed (FIX 11) */}
      <div>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#2A2A2A', textTransform: 'uppercase', padding: '8px 16px', borderBottom: '1px solid #1E1E1E' }}>
          ANOMALY STREAM
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {ANOMALY_EVENTS.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ height: 80 }}>
              <span style={{ width: 6, height: 6, background: '#1A7A1A', marginBottom: 8 }} />
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#2A2A2A' }}>ALL NOMINAL</span>
            </div>
          ) : ANOMALY_EVENTS.map((evt, i) => (
            <div
              key={i}
              style={{
                minHeight: 36, padding: '8px 16px 8px 14px',
                borderLeft: `2px solid ${SEVERITY_COLORS[evt.severity]}`,
                borderBottom: '1px solid #141414',
                background: '#0A0A0A',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#3D3D3D' }}>{evt.timestamp}</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#9A9A9A', fontWeight: 500 }}>{evt.station}</span>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#7A7A7A', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {evt.description}
              </div>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#3D3D3D', textTransform: 'uppercase', marginTop: 2 }}>
                {evt.flag}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
