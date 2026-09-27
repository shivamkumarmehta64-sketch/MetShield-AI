'use client';

import { useState } from 'react';
import Topbar from '../dashboard/Topbar';
import Sidebar from '../dashboard/Sidebar';
import KpiStrip from '../dashboard/KpiStrip';
import Badge from '../dashboard/Badge';

interface Incident {
  id: string;
  time: string;
  station: string;
  param: string;
  tier: string;
  severity: 'SEVERE' | 'WARNING' | 'INFO';
  resolution: 'RESOLVED' | 'IMPUTED' | 'ACTIVE' | 'DISPATCHED';
}

const INCIDENTS: Incident[] = [
  { id: 'INC-20260927-001', time: '09:42:17Z', station: 'AWS-HYD-06', param: 'P', tier: 'TIER-1', severity: 'SEVERE', resolution: 'ACTIVE' },
  { id: 'INC-20260927-002', time: '09:38:44Z', station: 'AWS-CCU-02', param: 'T', tier: 'TIER-2', severity: 'WARNING', resolution: 'DISPATCHED' },
  { id: 'INC-20260927-003', time: '09:35:12Z', station: 'AWS-JAI-09', param: 'RH', tier: 'TIER-2', severity: 'WARNING', resolution: 'IMPUTED' },
  { id: 'INC-20260927-004', time: '09:31:05Z', station: 'AWS-BHO-12', param: 'PKT', tier: 'TIER-3', severity: 'INFO', resolution: 'RESOLVED' },
  { id: 'INC-20260927-005', time: '09:28:51Z', station: 'AWS-GAU-13', param: 'T', tier: 'TIER-1', severity: 'INFO', resolution: 'RESOLVED' },
  { id: 'INC-20260927-006', time: '09:22:18Z', station: 'AWS-AMD-07', param: 'P', tier: 'TIER-2', severity: 'WARNING', resolution: 'RESOLVED' },
  { id: 'INC-20260927-007', time: '09:18:33Z', station: 'AWS-DEL-01', param: 'T', tier: 'TIER-1', severity: 'INFO', resolution: 'RESOLVED' },
  { id: 'INC-20260927-008', time: '09:12:47Z', station: 'AWS-MUM-04', param: 'RH', tier: 'TIER-3', severity: 'INFO', resolution: 'RESOLVED' },
  { id: 'INC-20260927-009', time: '09:08:22Z', station: 'AWS-MAA-03', param: 'P', tier: 'TIER-2', severity: 'WARNING', resolution: 'DISPATCHED' },
  { id: 'INC-20260927-010', time: '09:01:15Z', station: 'AWS-BLR-05', param: 'T', tier: 'TIER-1', severity: 'INFO', resolution: 'RESOLVED' },
  { id: 'INC-20260927-011', time: '08:55:40Z', station: 'AWS-PNQ-08', param: 'RH', tier: 'TIER-3', severity: 'INFO', resolution: 'RESOLVED' },
  { id: 'INC-20260927-012', time: '08:48:09Z', station: 'AWS-LKO-10', param: 'P', tier: 'TIER-2', severity: 'WARNING', resolution: 'IMPUTED' },
];

export default function IncidentsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [severity, setSeverity] = useState('ALL');
  const [tier, setTier] = useState('ALL');
  const [station, setStation] = useState('');

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      <Topbar breadcrumb="INCIDENT LOG" />
      <Sidebar />

      <div className="fixed left-[220px] right-0 top-[56px] bottom-0 overflow-y-auto" style={{ background: '#FFFFFF' }}>
        <KpiStrip />

        <div style={{ padding: 28 }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>INCIDENT REGISTRY</h1>
              <p style={{ fontSize: 13, color: '#7A7A7A', margin: '4px 0 0' }}>WMO-compliant anomaly audit trail</p>
            </div>
            <div className="flex items-center gap-2">
              <button style={{ fontSize: 11, fontWeight: 500, color: '#3D3D3D', border: '1px solid #D0D0D0', padding: '6px 12px', borderRadius: 0, background: '#FFFFFF', cursor: 'pointer' }}>
                ↓ Export CSV
              </button>
              <button style={{ fontSize: 11, fontWeight: 500, color: '#3D3D3D', border: '1px solid #D0D0D0', padding: '6px 12px', borderRadius: 0, background: '#FFFFFF', cursor: 'pointer' }}>
                ↓ Export JSON
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap" style={{ background: '#F7F7F7', border: '1px solid #E8E8E8', padding: '10px 16px', marginTop: 20, marginBottom: 20 }}>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ height: 30, fontSize: 11, color: '#3D3D3D', background: '#FFFFFF', border: '1px solid #D0D0D0', padding: '0 8px', borderRadius: 0, width: 130 }} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ height: 30, fontSize: 11, color: '#3D3D3D', background: '#FFFFFF', border: '1px solid #D0D0D0', padding: '0 8px', borderRadius: 0, width: 130 }} />
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ height: 30, fontSize: 11, color: '#3D3D3D', background: '#FFFFFF', border: '1px solid #D0D0D0', padding: '0 28px 0 8px', borderRadius: 0, width: 120 }}>
              <option value="ALL">All</option>
              <option value="SEVERE">SEVERE</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
            </select>
            <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ height: 30, fontSize: 11, color: '#3D3D3D', background: '#FFFFFF', border: '1px solid #D0D0D0', padding: '0 28px 0 8px', borderRadius: 0, width: 100 }}>
              <option value="ALL">All</option>
              <option value="TIER-1">TIER-1</option>
              <option value="TIER-2">TIER-2</option>
              <option value="TIER-3">TIER-3</option>
            </select>
            <input type="text" value={station} onChange={(e) => setStation(e.target.value)} placeholder="AWS-ID" style={{ height: 30, fontSize: 11, color: '#3D3D3D', background: '#FFFFFF', border: '1px solid #D0D0D0', padding: '0 8px', borderRadius: 0, width: 130 }} />
            <button style={{ background: '#0A0A0A', color: '#FFFFFF', fontSize: 11, fontWeight: 500, padding: '6px 16px', borderRadius: 0, height: 30, border: 'none', cursor: 'pointer' }}>
              Apply
            </button>
            <span style={{ fontSize: 11, color: '#7A7A7A', marginLeft: 'auto' }}>Showing {INCIDENTS.length} incidents</span>
          </div>

          <div style={{ border: '1px solid #E8E8E8', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F7F7F7', borderBottom: '1px solid #E8E8E8' }}>
                  {['INC-ID', 'UTC TIME', 'STATION', 'PARAM', 'QC TIER', 'SEVERITY', 'RESOLUTION'].map((h) => (
                    <th key={h} style={{ height: 36, padding: '0 12px', textAlign: 'left', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#7A7A7A', letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INCIDENTS.map((inc, i) => (
                  <tr key={inc.id} style={{ background: '#FFFFFF', borderBottom: i < INCIDENTS.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
                    <td style={{ height: 44, padding: '0 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#7A7A7A' }}>{inc.id}</td>
                    <td style={{ height: 44, padding: '0 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#3D3D3D' }}>{inc.time}</td>
                    <td style={{ height: 44, padding: '0 12px', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', color: '#0A0A0A' }}>{inc.station}</td>
                    <td style={{ height: 44, padding: '0 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#3D3D3D' }}>{inc.param}</td>
                    <td style={{ height: 44, padding: '0 12px', fontSize: 11, color: '#3D3D3D' }}>{inc.tier}</td>
                    <td style={{ height: 44, padding: '0 12px' }}>
                      <Badge variant={inc.severity} />
                    </td>
                    <td style={{ height: 44, padding: '0 12px' }}>
                      <Badge variant={inc.resolution} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
