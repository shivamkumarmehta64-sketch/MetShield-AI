'use client';

import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import Badge from './Badge';

type QCStatus = 'NOMINAL' | 'FLAGGED' | 'QUARANTINED' | 'OFFLINE' | 'IMPUTED';

interface Station {
  id: string;
  district: string;
  temp: number;
  pressure: number;
  rh: number;
  qc: QCStatus;
  lastSync: string;
}

const STATIONS: Station[] = [
  { id: 'AWS-DEL-01', district: 'New Delhi, DL', temp: 32.4, pressure: 1008.2, rh: 58.0, qc: 'NOMINAL', lastSync: '09:42:17Z' },
  { id: 'AWS-MUM-04', district: 'Mumbai, MH', temp: 31.8, pressure: 1009.5, rh: 72.3, qc: 'NOMINAL', lastSync: '09:42:15Z' },
  { id: 'AWS-CCU-02', district: 'Kolkata, WB', temp: 33.1, pressure: 1007.8, rh: 65.4, qc: 'FLAGGED', lastSync: '09:41:58Z' },
  { id: 'AWS-MAA-03', district: 'Chennai, TN', temp: 34.2, pressure: 1006.9, rh: 61.2, qc: 'NOMINAL', lastSync: '09:42:10Z' },
  { id: 'AWS-BLR-05', district: 'Bengaluru, KA', temp: 29.6, pressure: 1010.3, rh: 55.8, qc: 'NOMINAL', lastSync: '09:42:12Z' },
  { id: 'AWS-HYD-06', district: 'Hyderabad, TS', temp: 33.8, pressure: 1008.7, rh: 52.1, qc: 'QUARANTINED', lastSync: '09:38:44Z' },
  { id: 'AWS-AMD-07', district: 'Ahmedabad, GJ', temp: 35.1, pressure: 1007.2, rh: 48.6, qc: 'NOMINAL', lastSync: '09:42:08Z' },
  { id: 'AWS-PNQ-08', district: 'Pune, MH', temp: 30.9, pressure: 1009.8, rh: 60.4, qc: 'NOMINAL', lastSync: '09:42:14Z' },
  { id: 'AWS-JAI-09', district: 'Jaipur, RJ', temp: 36.2, pressure: 1006.5, rh: 42.3, qc: 'FLAGGED', lastSync: '09:40:33Z' },
  { id: 'AWS-LKO-10', district: 'Lucknow, UP', temp: 33.5, pressure: 1008.1, rh: 57.9, qc: 'NOMINAL', lastSync: '09:42:16Z' },
  { id: 'AWS-PAT-11', district: 'Patna, BR', temp: 34.0, pressure: 1007.6, rh: 63.7, qc: 'NOMINAL', lastSync: '09:42:11Z' },
  { id: 'AWS-BHO-12', district: 'Bhopal, MP', temp: 32.7, pressure: 1008.9, rh: 54.2, qc: 'OFFLINE', lastSync: '08:55:22Z' },
  { id: 'AWS-GAU-13', district: 'Guwahati, AS', temp: 31.2, pressure: 1009.1, rh: 78.5, qc: 'NOMINAL', lastSync: '09:42:13Z' },
  { id: 'AWS-CHN-14', district: 'Chandigarh, CH', temp: 33.9, pressure: 1008.4, rh: 50.8, qc: 'IMPUTED', lastSync: '09:42:09Z' },
  { id: 'AWS-BPL-15', district: 'Bhubaneswar, OD', temp: 32.8, pressure: 1007.9, rh: 66.1, qc: 'NOMINAL', lastSync: '09:42:15Z' },
  { id: 'AWS-AGR-16', district: 'Agra, UP', temp: 35.5, pressure: 1006.8, rh: 45.7, qc: 'NOMINAL', lastSync: '09:42:07Z' },
  { id: 'AWS-NAG-17', district: 'Nagpur, MH', temp: 34.6, pressure: 1007.4, rh: 49.3, qc: 'NOMINAL', lastSync: '09:42:10Z' },
  { id: 'AWS-VNS-18', district: 'Varanasi, UP', temp: 33.3, pressure: 1008.3, rh: 59.6, qc: 'NOMINAL', lastSync: '09:42:12Z' },
  { id: 'AWS-IXC-19', district: 'Imphal, MN', temp: 28.4, pressure: 1010.7, rh: 81.2, qc: 'NOMINAL', lastSync: '09:42:14Z' },
  { id: 'AWS-SHJ-20', district: 'Shillong, ML', temp: 24.1, pressure: 1011.2, rh: 85.7, qc: 'NOMINAL', lastSync: '09:42:16Z' },
];

const PAGE_SIZE = 50;

export default function StationTable() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(0);

  const filtered = STATIONS.filter((s) => {
    const matchSearch = !search || s.id.toLowerCase().includes(search.toLowerCase()) || s.district.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || s.qc === filter;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div style={{ background: '#FFFFFF', padding: '24px 28px' }}>
      <div className="flex items-end justify-between" style={{ borderBottom: '1px solid #E8E8E8', paddingBottom: 16 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A' }}>ALL STATIONS</span>
          <span style={{ color: '#D0D0D0' }}>|</span>
          <span style={{ fontSize: 12, color: '#7A7A7A' }}>1,350 nodes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} color="#BBBBBB" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="AWS-ID, district, state…"
              style={{
                width: 220, height: 32, background: '#FFFFFF', border: '1px solid #D0D0D0',
                borderRadius: 0, padding: '0 10px 0 28px', fontSize: 11, fontFamily: 'var(--font-mono)',
                color: '#3D3D3D', outline: 'none',
              }}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0); }}
            style={{
              width: 140, height: 32, background: '#FFFFFF', border: '1px solid #D0D0D0',
              borderRadius: 0, padding: '0 28px 0 10px', fontSize: 11, color: '#3D3D3D', outline: 'none',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="NOMINAL">NOMINAL</option>
            <option value="FLAGGED">FLAGGED</option>
            <option value="QUARANTINED">QUARANTINED</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>
          <button
            style={{
              fontSize: 11, fontWeight: 500, color: '#3D3D3D', border: '1px solid #D0D0D0',
              padding: '6px 12px', borderRadius: 0, background: '#FFFFFF', cursor: 'pointer',
            }}
          >
            ↓ CSV
          </button>
        </div>
      </div>

      <div style={{ border: '1px solid #E8E8E8', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7F7F7', borderBottom: '1px solid #E8E8E8' }}>
              {['STATION ID', 'DISTRICT', 'TEMP', 'PRESSURE', 'RH', 'QC STATUS', 'LAST SYNC', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    height: 36, padding: '0 12px', textAlign: 'left', fontSize: 10, fontWeight: 500,
                    textTransform: 'uppercase', color: '#7A7A7A', letterSpacing: '0.08em',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((s, i) => (
              <tr
                key={s.id}
                style={{
                  background: '#FFFFFF',
                  borderBottom: i < pageItems.length - 1 ? '1px solid #F0F0F0' : 'none',
                }}
                className="hover:bg-content-bg-hover"
              >
                <td style={{ height: 44, padding: '0 12px', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-mono)', color: '#0A0A0A' }}>{s.id}</td>
                <td style={{ height: 44, padding: '0 12px', fontSize: 12, color: '#3D3D3D' }}>{s.district}</td>
                <td style={{ height: 44, padding: '0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#0A0A0A' }}>
                  {s.temp.toFixed(1)}<span style={{ fontSize: 10, color: '#7A7A7A' }}>°C</span>
                </td>
                <td style={{ height: 44, padding: '0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#0A0A0A' }}>
                  {s.pressure.toFixed(1)}<span style={{ fontSize: 10, color: '#7A7A7A' }}> hPa</span>
                </td>
                <td style={{ height: 44, padding: '0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#0A0A0A' }}>
                  {s.rh.toFixed(1)}<span style={{ fontSize: 10, color: '#7A7A7A' }}> %</span>
                </td>
                <td style={{ height: 44, padding: '0 12px' }}>
                  <Badge variant={s.qc} />
                </td>
                <td style={{ height: 44, padding: '0 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: s.qc === 'OFFLINE' ? '#C0162C' : '#7A7A7A' }}>
                  {s.lastSync}
                </td>
                    <td style={{ height: 44, padding: '0 12px', fontSize: 12, color: '#7A7A7A', cursor: 'pointer' }}>
                      <button aria-label={`Open station detail for ${s.id}`} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 12, padding: 0 }}>→</button>
                    </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between" style={{ paddingTop: 12 }}>
        <span style={{ fontSize: 11, color: '#7A7A7A' }}>
          Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            style={{
              fontSize: 11, fontWeight: 500, color: currentPage === 0 ? '#BBBBBB' : '#3D3D3D',
              border: `1px solid ${currentPage === 0 ? '#F0F0F0' : '#D0D0D0'}`,
              padding: '5px 12px', borderRadius: 0, background: '#FFFFFF', cursor: currentPage === 0 ? 'default' : 'pointer',
            }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            style={{
              fontSize: 11, fontWeight: 500, color: currentPage >= totalPages - 1 ? '#BBBBBB' : '#3D3D3D',
              border: `1px solid ${currentPage >= totalPages - 1 ? '#F0F0F0' : '#D0D0D0'}`,
              padding: '5px 12px', borderRadius: 0, background: '#FFFFFF', cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
