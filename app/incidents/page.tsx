'use client';
import React, { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, ShieldCheck, Download } from 'lucide-react';
import {
  getAuditLogSnapshot,
  subscribeToAuditLog,
  StoredFaultEvent,
  generateAuditCsvContent,
} from '@/lib/supabaseClient';

export default function IncidentsPage() {
  /**
   * The audit buffer is an external mutable store, so it is read through
   * useSyncExternalStore rather than copied into useState inside an effect.
   *
   * The previous version snapshotted the buffer once on mount, which meant the
   * incident log never showed a fault that arrived after the page loaded — and
   * doing that copy in an effect also triggered a cascading re-render on every
   * visit. getAuditLogSnapshot returns an identity-stable array that is
   * invalidated on mutation, as useSyncExternalStore requires.
   */
  const rawRecords = useSyncExternalStore(
    subscribeToAuditLog,
    getAuditLogSnapshot,
    getAuditLogSnapshot
  );

  const incidents = useMemo<StoredFaultEvent[]>(
    () => [...rawRecords].reverse(), // latest first
    [rawRecords]
  );

  const handleExport = () => {
    if (incidents.length === 0) return;
    const csvContent = generateAuditCsvContent(incidents);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `JATAYU_Historical_Incidents_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to National Operations Command</span>
        </Link>
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Historical Incident Log</h1>
          </div>
          <button 
            onClick={handleExport}
            disabled={incidents.length === 0}
            className="flex items-center gap-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export NIC Audit (.csv)
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-800 rounded-xl text-slate-400">
            <ShieldCheck className="w-12 h-12 text-emerald-500/50 mb-4" />
            <p className="text-lg font-semibold text-slate-300">No Historical Incidents Logged</p>
            <p className="text-sm mt-1">AWS Telemetry network is operating nominally.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map(inc => (
              <div key={inc.eventId} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg border ${
                    inc.severity === 'GENUINE_WEATHER' ? 'bg-blue-950/30 border-blue-500/30 text-blue-400' :
                    inc.severity === 'CRITICAL' ? 'bg-rose-950/30 border-rose-500/30 text-rose-400' :
                    'bg-amber-950/30 border-amber-500/30 text-amber-400'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white font-mono">{inc.stationId} <span className="text-slate-400 text-xs ml-2">{inc.timeIST}</span></h3>
                    <p className="text-sm text-slate-300 mt-1">{inc.xaiAttribution.explanation}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                      <span className="text-rose-400">Raw: {inc.rawVal.toFixed(1)}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-emerald-400">Imputed: {inc.imputedVal.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end shrink-0">
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                    inc.severity === 'GENUINE_WEATHER' ? 'bg-blue-500/20 text-sky-300 border-blue-500/40' :
                    inc.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {inc.classification}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-2 truncate max-w-[250px]">
                    Action: {inc.recommendedAction}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
