'use client';

import Topbar from '../dashboard/Topbar';
import Sidebar from '../dashboard/Sidebar';
import KpiStrip from '../dashboard/KpiStrip';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts';

const QC_TREND = Array.from({ length: 30 }, (_, i) => ({
  date: `${27 + i - 30} Sep`,
  rate: 98.8 + Math.sin(i * 0.3) * 0.4 + Math.random() * 0.3,
}));

const ANOMALY_DATA = [
  { type: 'STEP_JUMP', count: 342, fill: '#C0162C' },
  { type: 'RANGE_BREACH', count: 287, fill: '#7A5A00' },
  { type: 'THERMODYNAMIC', count: 198, fill: '#5588CC' },
  { type: 'CALIBRATION_DRIFT', count: 256, fill: '#CCA300' },
  { type: 'PACKET_LOSS', count: 164, fill: '#3D3D3D' },
];

const QC_TIERS = [
  { tier: 'TIER-1', desc: 'RANGE CHECK', count: 487, pct: '39.1%' },
  { tier: 'TIER-2', desc: 'TEMPORAL CONSISTENCY', count: 392, pct: '31.4%' },
  { tier: 'TIER-3', desc: 'CROSS-PARAMETER', count: 368, pct: '29.5%' },
];

const LATENCY_DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  p50: 1.5 + Math.random() * 0.8,
  p95: 3.8 + Math.random() * 1.2,
  p99: 5.5 + Math.random() * 1.5,
}));

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 0, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#FFFFFF' },
  labelStyle: { color: '#5A5A5A' },
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      <Topbar breadcrumb="QC ANALYTICS" />
      <Sidebar />

      <div className="fixed left-[220px] right-0 top-[56px] bottom-0 overflow-y-auto" style={{ background: '#FFFFFF' }}>
        <KpiStrip />

        <div style={{ padding: 28 }}>
          {/* Stat Row */}
          <div className="grid grid-cols-3" style={{ border: '1px solid #E8E8E8' }}>
            {[
              { label: '30-DAY QC AVG', value: '99.1%', sub: '↑ 0.3% vs prior month' },
              { label: 'TOTAL ANOMALIES', value: '1,247', sub: '247 flagged this week' },
              { label: 'AVG LATENCY', value: '2.8ms', sub: 'P99: 6.1ms' },
            ].map((s, i) => (
              <div key={s.label} style={{ borderRight: i < 2 ? '1px solid #E8E8E8' : 'none', padding: '20px 24px' }}>
                <div className="font-mono" style={{ fontSize: 10, textTransform: 'uppercase', color: '#7A7A7A', letterSpacing: '0.1em' }}>{s.label}</div>
                <div className="mpi-monospaced" style={{ fontSize: 40, fontWeight: 700, color: '#0A0A0A', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{s.value}</div>
                <div className="font-mono" style={{ fontSize: 11, color: '#7A7A7A', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Chart 1: QC Pass Rate Trend */}
          <div style={{ marginTop: 32 }}>
            <div className="mpi-eyebrow" style={{ marginBottom: 12 }}>30-DAY QC PASS RATE</div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={QC_TREND} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: '#7A7A7A' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[95, 100]} tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: '#7A7A7A' }} axisLine={false} tickLine={false} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <ReferenceLine y={99} stroke="#E8E8E8" strokeDasharray="4 2" label={{ value: '99% target', position: 'right', fontSize: 9, fill: '#BBBBBB' }} />
                  <Line type="monotone" dataKey="rate" stroke="#0A0A0A" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2 + Stat Stack */}
          <div className="grid grid-cols-12 gap-6" style={{ marginTop: 32 }}>
            <div className="col-span-8">
              <div className="mpi-eyebrow" style={{ marginBottom: 12 }}>ANOMALY TYPE DISTRIBUTION</div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ANOMALY_DATA} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="type" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: '#7A7A7A' }} axisLine={false} tickLine={false} width={140} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={0} barSize={8}>
                      {ANOMALY_DATA.map((entry, i) => (
                        <rect key={i} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="count" position="right" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: '#7A7A7A' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="col-span-4">
              <div className="mpi-eyebrow" style={{ marginBottom: 12 }}>QC TIER BREAKDOWN</div>
              {QC_TIERS.map((t) => (
                <div key={t.tier} className="flex items-center justify-between" style={{ padding: '14px 0', borderBottom: '1px solid #E8E8E8' }}>
                  <div>
                    <span style={{ fontSize: 12, color: '#3D3D3D' }}>{t.tier} · {t.desc}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="mpi-monospaced" style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A' }}>{t.count}</span>
                    <span style={{ fontSize: 11, color: '#7A7A7A' }}>{t.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 3: Latency Distribution */}
          <div style={{ marginTop: 32 }}>
            <div className="mpi-eyebrow" style={{ marginBottom: 12 }}>DETECTION LATENCY</div>
            <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
              <span className="font-mono" style={{ fontSize: 11, color: '#7A7A7A' }}>P50: 1.8ms</span>
              <span style={{ color: '#E8E8E8' }}>·</span>
              <span className="font-mono" style={{ fontSize: 11, color: '#7A7A7A' }}>P95: 4.2ms</span>
              <span style={{ color: '#E8E8E8' }}>·</span>
              <span className="font-mono" style={{ fontSize: 11, color: '#7A7A7A' }}>P99: 6.1ms</span>
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={LATENCY_DATA} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: '#7A7A7A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: '#7A7A7A' }} axisLine={false} tickLine={false} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <ReferenceLine y={5} stroke="#E8E8E8" strokeDasharray="4 2" label={{ value: '5ms SLA', position: 'right', fontSize: 9, fill: '#BBBBBB' }} />
                  <Line type="monotone" dataKey="p99" stroke="#C0162C" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
