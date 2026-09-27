'use client';

import { useState } from 'react';
import Topbar from '../dashboard/Topbar';
import Sidebar from '../dashboard/Sidebar';
import Badge from '../dashboard/Badge';

interface AuditEntry {
  timestamp: string;
  station: string;
  flag: string;
  hmac: string;
  merkle: string;
  workOrder: 'ISSUED' | 'RESOLVED' | 'N/A';
}

const AUDIT_ENTRIES: AuditEntry[] = [
  { timestamp: '09:42:17Z', station: 'AWS-DEL-01', flag: 'NOMINAL', hmac: 'a3f2b8c1d4e5f67890123456', merkle: 'b7c9d1e2f3a456789012345678', workOrder: 'N/A' },
  { timestamp: '09:42:15Z', station: 'AWS-MUM-04', flag: 'NOMINAL', hmac: 'c4d5e6f7890123456789012', merkle: 'd8e1f2a3b4c567890123456789', workOrder: 'N/A' },
  { timestamp: '09:41:58Z', station: 'AWS-CCU-02', flag: 'FLAGGED', hmac: 'e5f67890123456789012345', merkle: 'e9f2a3b4c5d678901234567890', workOrder: 'ISSUED' },
  { timestamp: '09:42:10Z', station: 'AWS-MAA-03', flag: 'NOMINAL', hmac: 'f6789012345678901234567', merkle: 'f1a3b4c5d6e789012345678901', workOrder: 'N/A' },
  { timestamp: '09:38:44Z', station: 'AWS-HYD-06', flag: 'QUARANTINED', hmac: 'a7890123456789012345678', merkle: 'a2b4c5d6e7f890123456789012', workOrder: 'ISSUED' },
  { timestamp: '09:42:12Z', station: 'AWS-BLR-05', flag: 'NOMINAL', hmac: 'b8901234567890123456789', merkle: 'b3c5d6e7f8a901234567890123', workOrder: 'N/A' },
  { timestamp: '09:40:33Z', station: 'AWS-JAI-09', flag: 'FLAGGED', hmac: 'c9012345678901234567890', merkle: 'c4d6e7f8a9b012345678901234', workOrder: 'RESOLVED' },
  { timestamp: '09:42:16Z', station: 'AWS-LKO-10', flag: 'NOMINAL', hmac: 'd0123456789012345678901', merkle: 'd5e7f8a9b0c123456789012345', workOrder: 'N/A' },
  { timestamp: '09:42:11Z', station: 'AWS-PAT-11', flag: 'NOMINAL', hmac: 'e1234567890123456789012', merkle: 'e6f8a9b0c1d234567890123456', workOrder: 'N/A' },
  { timestamp: '08:55:22Z', station: 'AWS-BHO-12', flag: 'OFFLINE', hmac: 'f2345678901234567890123', merkle: 'f7a9b0c1d2e345678901234567', workOrder: 'ISSUED' },
  { timestamp: '09:42:13Z', station: 'AWS-GAU-13', flag: 'NOMINAL', hmac: 'a3456789012345678901234', merkle: 'a8b0c1d2e3f456789012345678', workOrder: 'N/A' },
  { timestamp: '09:42:09Z', station: 'AWS-CHN-14', flag: 'IMPUTED', hmac: 'b4567890123456789012345', merkle: 'b9c1d2e3f4a567890123456789', workOrder: 'RESOLVED' },
];

function truncateHash(hash: string): string {
  if (hash.length <= 24) return hash;
  return `${hash.slice(0, 16)}…${hash.slice(-8)}`;
}

export default function AuditReportPage() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Topbar breadcrumb="CRYPTOGRAPHIC AUDIT" />
      <Sidebar />

      <div className="fixed left-[220px] right-0 top-[56px] bottom-0 overflow-y-auto" style={{ background: '#0A0A0A' }}>
        <div style={{ padding: 32 }}>
          <h1 className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>CRYPTOGRAPHIC AUDIT DOSSIER</h1>
          <p className="font-mono" style={{ fontSize: 11, color: '#3D3D3D', marginTop: 4 }}>HMAC-SHA256 · Merkle Chain · NABL Work Orders</p>

          <div className="flex items-center gap-3" style={{ marginTop: 16, marginBottom: 16 }}>
            <span className="font-mono" style={{ fontSize: 10, color: '#2A2A2A' }}>HMAC-SHA256 Seal</span>
            <span style={{ color: '#1E1E1E' }}>·</span>
            <span className="font-mono" style={{ fontSize: 10, color: '#2A2A2A' }}>Merkle Root</span>
            <span style={{ color: '#1E1E1E' }}>·</span>
            <span className="font-mono" style={{ fontSize: 10, color: '#2A2A2A' }}>Work Order Status</span>
          </div>

          <div style={{ border: '1px solid #1E1E1E', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#141414', borderBottom: '1px solid #1E1E1E' }}>
                  {['TIMESTAMP', 'STATION', 'FLAG', 'HMAC SEAL', 'MERKLE ROOT', 'WORK ORDER'].map((h) => (
                    <th key={h} style={{ height: 36, padding: '0 12px', textAlign: 'left', fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#3D3D3D', letterSpacing: '0.08em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AUDIT_ENTRIES.map((entry, i) => (
                  <tr key={i} style={{ background: '#0A0A0A', borderBottom: '1px solid #141414' }}>
                    <td style={{ height: 40, padding: '0 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#3D3D3D' }}>{entry.timestamp}</td>
                    <td style={{ height: 40, padding: '0 12px', fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', color: '#9A9A9A' }}>{entry.station}</td>
                    <td style={{ height: 40, padding: '0 12px' }}>
                      <Badge variant={entry.flag as 'NOMINAL' | 'FLAGGED' | 'QUARANTINED' | 'OFFLINE' | 'IMPUTED'} />
                    </td>
                    <td
                      style={{ height: 40, padding: '0 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: '#5A5A5A', cursor: 'pointer' }}
                      onClick={() => handleCopy(entry.hmac, i)}
                      title={copiedIdx === i ? 'Copied!' : 'Click to copy'}
                    >
                      {copiedIdx === i ? 'Copied!' : truncateHash(entry.hmac)}
                    </td>
                    <td style={{ height: 40, padding: '0 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: '#3D3D3D' }}>
                      {truncateHash(entry.merkle)}
                    </td>
                    <td style={{ height: 40, padding: '0 12px' }}>
                      <Badge variant={entry.workOrder} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#141414', border: '1px solid #1E1E1E', padding: '16px 20px', marginTop: 24 }}>
            <div className="font-mono" style={{ fontSize: 10, textTransform: 'uppercase', color: '#3D3D3D' }}>CHAIN INTEGRITY</div>
            <div className="font-mono" style={{ fontSize: 12, color: '#1A7A1A', marginTop: 4 }}>✓ All 1,247 packets verified</div>
          </div>
        </div>
      </div>
    </div>
  );
}
