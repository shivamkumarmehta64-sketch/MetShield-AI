'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Radio, CheckCircle2 } from 'lucide-react';

export default function StationsPage() {
  const STATIONS = [
    { id: 'AWS-DEL-01', name: 'New Delhi Safdarjung', state: 'Delhi', sensor: 'Vaisala PTB110', calibrated: '2025-10-15' },
    { id: 'AWS-MUM-04', name: 'Mumbai Colaba Coastal', state: 'Maharashtra', sensor: 'Humicap', calibrated: '2026-01-20' },
    { id: 'AWS-BLR-07', name: 'Bengaluru GKVK Agro', state: 'Karnataka', sensor: 'PT100', calibrated: '2025-11-05' },
    { id: 'AWS-KOL-02', name: 'Kolkata Alipore Met', state: 'West Bengal', sensor: 'Vaisala PTB110', calibrated: '2026-03-12' },
    { id: 'AWS-JOD-08', name: 'Jodhpur Arid Zone', state: 'Rajasthan', sensor: 'PT100', calibrated: '2025-08-30' },
  ];

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to National Operations Command</span>
        </Link>
        
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <Radio className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">AWS Network Station Inventory</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STATIONS.map(st => (
            <div key={st.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-mono text-emerald-400 font-bold">{st.id}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{st.name}</h3>
              <p className="text-xs text-slate-400 mb-4">{st.state}</p>
              
              <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sensor Model:</span>
                  <span className="font-semibold text-sky-300">{st.sensor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Calibration Valid:</span>
                  <span className="font-mono">{st.calibrated}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
