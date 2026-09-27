'use client';

import Topbar from '../dashboard/Topbar';
import Sidebar from '../dashboard/Sidebar';
import KpiStrip from '../dashboard/KpiStrip';
import Badge from '../dashboard/Badge';
import LeafletMap from '../dashboard/LeafletMap';

interface StationInfo {
  id: string;
  name: string;
  district: string;
  state: string;
  temp: number;
  pressure: number;
  rh: number;
  qc: 'NOMINAL' | 'FLAGGED' | 'QUARANTINED' | 'OFFLINE' | 'IMPUTED';
  lastSync: string;
  elevation: number;
  installDate: string;
}

const STATIONS: StationInfo[] = [
  { id: 'AWS-DEL-01', name: 'Safdarjung', district: 'New Delhi', state: 'DL', temp: 32.4, pressure: 1008.2, rh: 58.0, qc: 'NOMINAL', lastSync: '09:42:17Z', elevation: 216, installDate: '2019-03-15' },
  { id: 'AWS-MUM-04', name: 'Santacruz', district: 'Mumbai', state: 'MH', temp: 31.8, pressure: 1009.5, rh: 72.3, qc: 'NOMINAL', lastSync: '09:42:15Z', elevation: 11, installDate: '2018-11-22' },
  { id: 'AWS-CCU-02', name: 'Alipore', district: 'Kolkata', state: 'WB', temp: 33.1, pressure: 1007.8, rh: 65.4, qc: 'FLAGGED', lastSync: '09:41:58Z', elevation: 6, installDate: '2020-01-08' },
  { id: 'AWS-MAA-03', name: 'Nungambakkam', district: 'Chennai', state: 'TN', temp: 34.2, pressure: 1006.9, rh: 61.2, qc: 'NOMINAL', lastSync: '09:42:10Z', elevation: 16, installDate: '2017-06-30' },
  { id: 'AWS-BLR-05', name: 'Hebbal', district: 'Bengaluru', state: 'KA', temp: 29.6, pressure: 1010.3, rh: 55.8, qc: 'NOMINAL', lastSync: '09:42:12Z', elevation: 920, installDate: '2021-02-14' },
  { id: 'AWS-HYD-06', name: 'Begumpet', district: 'Hyderabad', state: 'TS', temp: 33.8, pressure: 1008.7, rh: 52.1, qc: 'QUARANTINED', lastSync: '09:38:44Z', elevation: 531, installDate: '2019-08-19' },
  { id: 'AWS-AMD-07', name: 'Airport', district: 'Ahmedabad', state: 'GJ', temp: 35.1, pressure: 1007.2, rh: 48.6, qc: 'NOMINAL', lastSync: '09:42:08Z', elevation: 53, installDate: '2020-05-02' },
  { id: 'AWS-PNQ-08', name: 'Airport', district: 'Pune', state: 'MH', temp: 30.9, pressure: 1009.8, rh: 60.4, qc: 'NOMINAL', lastSync: '09:42:14Z', elevation: 561, installDate: '2018-09-11' },
  { id: 'AWS-JAI-09', name: 'Airport', district: 'Jaipur', state: 'RJ', temp: 36.2, pressure: 1006.5, rh: 42.3, qc: 'FLAGGED', lastSync: '09:40:33Z', elevation: 369, installDate: '2021-07-25' },
  { id: 'AWS-GAU-13', name: 'Airport', district: 'Guwahati', state: 'AS', temp: 31.2, pressure: 1009.1, rh: 78.5, qc: 'NOMINAL', lastSync: '09:42:13Z', elevation: 52, installDate: '2019-12-03' },
];

export default function StationsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      <Topbar breadcrumb="STATION REGISTRY" />
      <Sidebar />

      <div className="fixed left-[220px] right-0 top-[56px] bottom-0 overflow-y-auto" style={{ background: '#FFFFFF' }}>
        <KpiStrip />

        <div style={{ padding: '24px 28px' }}>
          <div style={{ marginBottom: 20 }}>
            <LeafletMap />
          </div>

          <div style={{ border: '1px solid #E8E8E8', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F7F7F7', borderBottom: '1px solid #E8E8E8' }}>
                  {['STATION ID', 'LOCATION', 'ELEVATION', 'TEMP', 'PRESSURE', 'RH', 'QC STATUS', 'LAST SYNC', 'INSTALLED'].map((h) => (
                    <th key={h} style={{ height: 36, padding: '0 12px', textAlign: 'left', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#7A7A7A', letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STATIONS.map((s, i) => (
                  <tr key={s.id} style={{ background: '#FFFFFF', borderBottom: i < STATIONS.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
                    <td style={{ height: 48, padding: '0 12px', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-mono)', color: '#0A0A0A' }}>{s.id}</td>
                    <td style={{ height: 48, padding: '0 12px', fontSize: 12, color: '#3D3D3D' }}>
                      {s.name}, {s.district} {s.state}
                    </td>
                    <td style={{ height: 48, padding: '0 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: '#7A7A7A' }}>
                      {s.elevation}m
                    </td>
                    <td style={{ height: 48, padding: '0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#0A0A0A' }}>
                      {s.temp.toFixed(1)}<span style={{ fontSize: 10, color: '#7A7A7A' }}>°C</span>
                    </td>
                    <td style={{ height: 48, padding: '0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#0A0A0A' }}>
                      {s.pressure.toFixed(1)}<span style={{ fontSize: 10, color: '#7A7A7A' }}> hPa</span>
                    </td>
                    <td style={{ height: 48, padding: '0 12px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#0A0A0A' }}>
                      {s.rh.toFixed(1)}<span style={{ fontSize: 10, color: '#7A7A7A' }}> %</span>
                    </td>
                    <td style={{ height: 48, padding: '0 12px' }}>
                      <Badge variant={s.qc} />
                    </td>
                    <td style={{ height: 48, padding: '0 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: s.qc === 'OFFLINE' ? '#C0162C' : '#7A7A7A' }}>
                      {s.lastSync}
                    </td>
                    <td style={{ height: 48, padding: '0 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#7A7A7A' }}>
                      {s.installDate}
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
