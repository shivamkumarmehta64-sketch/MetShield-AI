'use client';

import React, { useState } from 'react';
import { WorkOrderTicket } from '@/lib/anomalyLogic';
import { ClipboardList, AlertTriangle, CheckCircle2, Wrench, CloudLightning, FileSpreadsheet, BookOpen, Check, Printer } from 'lucide-react';
import Link from 'next/link';

interface Props {
  workOrders: WorkOrderTicket[];
  language: 'hi' | 'en';
  onOpenMethodology?: () => void;
  onOpenEmergencyAlert?: () => void;
}

const CLS_BADGES: Record<string, { cls: string; label: string; icon?: React.ReactNode }> = {
  GENUINE_CONVECTIVE_EVENT: { cls: 'bg-amber-100 text-amber-900 border-amber-300', label: 'Real Storm (Verified)', icon: <CloudLightning className="w-3 h-3 text-amber-700" /> },
  SENSOR_SPIKE: { cls: 'bg-red-100 text-red-900 border-red-300', label: 'Broken Sensor Wire', icon: <AlertTriangle className="w-3 h-3 text-red-700" /> },
  FROZEN_VALUE: { cls: 'bg-rose-100 text-rose-900 border-rose-300', label: 'Sensor Frozen (Unresponsive)', icon: <Wrench className="w-3 h-3 text-rose-700" /> },
  CALIBRATION_DRIFT: { cls: 'bg-yellow-100 text-yellow-900 border-yellow-300', label: 'Pressure Sensor Needs Recalibration' },
  TELEMETRY_PACKET_LOSS: { cls: 'bg-purple-100 text-purple-900 border-purple-300', label: 'Network Signal Lost' },
};

export const GovAnomalyRegister = React.memo<Props>(function GovAnomalyRegister({ workOrders, language, onOpenMethodology, onOpenEmergencyAlert }) {
  const [notice, setNotice] = useState<string | null>(null);

  const exportCSV = () => {
    const ts = new Date().toISOString();
    let csv = `========================================================================================\nNATIONAL AUTOMATIC WEATHER STATION QUALITY MANAGEMENT SYSTEM\nREAL-TIME SENSOR HEALTH, ANOMALY DETECTION & MAINTENANCE LOG\nEXTRACTED AT: ${ts} IST\n========================================================================================\n\n`;
    csv += `Ticket ID,Station Code,Observatory Name,State,Timestamp (IST),Parameter Involved,Classification,Alert Level,Fault Probability,XAI Contribution Breakdown,Observed vs Imputed,Action Taken,Work-Order Status\n`;
    workOrders.forEach(wo => {
      csv += `"${wo.ticketId}","${wo.stationId}","${wo.stationName}","${wo.state}","${wo.timestamp}","${wo.parameterInvolved}","${wo.classification}","${wo.alertLevel}","${(wo.faultProbability * 100).toFixed(1)}%","${wo.xaiBreakdown}","${wo.observedVsImputed}","${wo.operationalAction.replace(/"/g, '""')}","${wo.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `National_Weather_Sensor_Health_Report_${Date.now()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setNotice(`Generated and downloaded sensor health report with ${workOrders.length} records.`);
    setTimeout(() => setNotice(null), 4500);
  };

  return (
    <div className="bg-white border border-slate-300 rounded shadow-xs p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#002147] text-white rounded"><ClipboardList className="w-4 h-4" /></div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#002147]">
              {language === 'hi' ? 'स्वचालित सेंसर स्वास्थ्य एवं रख-रखाव लॉग' : 'Automated Sensor Health & Maintenance Alert Register'}
            </h2>
            <p className="text-xs text-slate-500">{language === 'hi' ? 'वास्तविक समय में सेंसर की खराबी, असली तूफान और त्वरित सुधार आदेश' : 'Real-time automated discrimination between real storms and broken sensors'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenEmergencyAlert && (
            <button onClick={onOpenEmergencyAlert} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer">
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
              <span>{language === 'hi' ? 'आपदा अलर्ट सिम्युलेटर (CAP)' : 'Disaster Alert Simulator (CAP)'}</span>
            </button>
          )}
          {onOpenMethodology && (
            <button onClick={onOpenMethodology} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors">
              <BookOpen className="w-3.5 h-3.5 text-amber-700" /><span>{language === 'hi' ? 'डब्ल्यूएमओ नियम देखें' : 'View WMO QC Rules & XAI'}</span>
            </button>
          )}
          <Link href="/audit-report" target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition-colors">
            <Printer className="w-3.5 h-3.5 text-slate-700" /><span>{language === 'hi' ? 'प्रिंट ऑडिट रिपोर्ट (PDF)' : 'Print Audit Report (PDF)'}</span>
          </Link>
          <button onClick={exportCSV} disabled={workOrders.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#002147] hover:bg-[#0B3B60] text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs">
            <FileSpreadsheet className="w-3.5 h-3.5" /><span>{language === 'hi' ? 'ऑडिट लॉग डाउनलोड (.csv)' : 'Download CSV'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-2 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded flex items-center gap-1.5 font-medium">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>{notice}</span>
        </div>
      )}

      <div className="overflow-x-auto border border-slate-300 rounded content-visibility-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#002147] text-white font-semibold text-[11px]">
              {['Incident Ticket ID', 'Station / State', 'Parameter', 'Root-Cause Classification', 'Fault Probability', 'XAI Contribution Breakdown', 'Observed vs Imputed', 'Operational Action Taken'].map((h, i) => (
                <th key={h} className={`py-2 px-2.5 ${i < 7 ? 'border-r border-slate-600' : ''} ${i === 4 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody suppressHydrationWarning className="divide-y divide-slate-200 font-mono tabular-nums text-[11px]">
            {workOrders.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                <div className="flex flex-col items-center justify-center gap-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-1" />
                  <span className="font-semibold text-slate-700">No Active Discontinuities or Hardware Faults</span>
                  <span className="text-xs text-slate-500">All 20 AWS nodes operating within nominal WMO quality tolerances.</span>
                </div>
              </td></tr>
            ) : workOrders.map((wo, idx) => {
              const badge = CLS_BADGES[wo.classification];
              return (
                <tr key={wo.ticketId} suppressHydrationWarning className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-[#F8FAFC] hover:bg-slate-50'}>
                  <td suppressHydrationWarning className="py-1.5 px-2.5 font-bold text-[#002147] border-r border-slate-200 whitespace-nowrap">
                    {wo.ticketId}<div suppressHydrationWarning className="text-[10px] text-slate-500 font-normal">{wo.timestamp}</div>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 whitespace-nowrap font-sans">
                    <div className="font-bold text-slate-800">{wo.stationId}</div><div className="text-[10px] text-slate-500">{wo.state}</div>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 font-sans font-medium text-slate-800">{wo.parameterInvolved}</td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 font-sans">
                    {badge && <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.cls} border`}>{badge.icon}{badge.label}</span>}
                    <div className="text-[10px] text-slate-500 mt-1">
                      <div>Physical Check: {wo.observedVsImputed === 'IMPUTED' ? 'FAIL' : 'PASS'}</div>
                      <div>Spatial Agreement: {wo.spatialValidation ? 'PASS' : 'FAIL'}</div>
                    </div>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-bold text-slate-800">
                    <div className="text-[10px] text-slate-500">Heuristic Confidence: {(wo.faultProbability * 100).toFixed(1)}%</div>
                  </td>
                  <td className="py-1.5 px-2.5 font-sans text-xs text-slate-700">
                    <div className="font-bold text-[#002147]">Action: {wo.operationalAction}</div>
                    <div className="text-[10px] text-slate-500">Final Decision: {wo.classification === 'GENUINE_CONVECTIVE_EVENT' ? 'GENUINE_WEATHER' : 'SENSOR_FAULT'}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
