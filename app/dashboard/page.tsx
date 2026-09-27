'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import KpiStrip from './KpiStrip';
import StationTable from './StationTable';
import TelemetryConsole from './TelemetryConsole';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'live'>('matrix');

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      <Topbar breadcrumb="OBSERVATION MATRIX" />
      <Sidebar />

      <div className="fixed left-[220px] right-0 top-[56px] bottom-0 overflow-y-auto" style={{ background: '#FFFFFF' }}>
        <KpiStrip />

        <div style={{ background: '#FFFFFF' }}>
          <div className="flex items-center gap-0" style={{ borderBottom: '1px solid #E8E8E8', padding: '0 28px' }}>
            {(['matrix', 'live'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="font-mono uppercase"
                style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
                  padding: '12px 16px', background: 'transparent', border: 'none',
                  borderBottom: `2px solid ${activeTab === tab ? '#C0162C' : 'transparent'}`,
                  color: activeTab === tab ? '#0A0A0A' : '#7A7A7A',
                  cursor: 'pointer', transition: 'color 100ms',
                }}
              >
                {tab === 'matrix' ? 'Station Matrix' : 'Live Feed'}
              </button>
            ))}
          </div>

          {activeTab === 'matrix' && (
            <div>
              <div style={{ padding: '20px 28px 0' }}>
                <LeafletMap />
              </div>
              <div style={{ paddingTop: 20 }}>
                <StationTable />
              </div>
            </div>
          )}

          {activeTab === 'live' && (
            <div style={{ padding: '20px 28px' }}>
              <TelemetryConsole />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
