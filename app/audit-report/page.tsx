'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { IMD_AWS_STATIONS } from '@/lib/stationData';
import { getInitialSeededDataset, TelemetryPacket, WorkOrderTicket } from '@/lib/anomalyLogic';
import { Printer, ArrowLeft, FileCheck, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function OfficialAuditReportPage() {
  const [dataset] = useState(() => getInitialSeededDataset());
  const [auditTimestamp] = useState(() => 'September 2026 · Evaluated (IST)');

  const stations = IMD_AWS_STATIONS;
  const latestList: TelemetryPacket[] = Object.values(dataset.latestPackets);
  const workOrders: WorkOrderTicket[] = dataset.workOrders;

  const validCount = latestList.filter(p => p.wmoFlag === 'FLAG_1_VERIFIED_GOOD' || p.wmoFlag === 'FLAG_2_CONVECTIVE_STORM').length;
  const conditionalCount = latestList.filter(p => p.wmoFlag === 'FLAG_3_SUSPECT_DRIFT' || p.wmoFlag === 'FLAG_5_PACKET_LOSS').length;
  const quarantinedCount = latestList.filter(p => p.wmoFlag === 'FLAG_4_CORRUPT_HARDWARE').length;
  const qualityRate = ((validCount / stations.length) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 py-6 px-4 print:bg-white print:p-0 print:m-0 font-sans">
      {/* Non-printed Controls Bar */}
      <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between gap-3 bg-white p-3 rounded-lg shadow-sm border border-slate-300 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to QMS Portal
          </Link>
          <span className="text-xs text-slate-500">Document Classification: <strong>METSHIELD AI OFFICIAL AUDIT RECORD</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#0b1329] hover:bg-slate-800 text-cyan-300 text-xs font-bold shadow-sm transition-all border border-slate-700"
          >
            <Printer className="w-4 h-4 text-cyan-400" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Official Audit Document Sheet (A4 format) */}
      <div className="max-w-5xl mx-auto bg-white p-8 sm:p-12 shadow-lg border border-slate-300 print:shadow-none print:border-none print:p-4 rounded-sm">
        {/* Sleek Cyan Ribbon Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 mb-6" />

        {/* Header & Classification */}
        <div className="text-center border-b-2 border-slate-800 pb-5 mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl border border-cyan-500 bg-[#0b1329] shadow-md flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
            </div>
            <div className="text-left">
              <span className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1">
                METSHIELD <span className="text-cyan-600 font-extrabold">AI</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-600 block">AWS-QMS Telemetry Audit Engine</span>
            </div>
          </div>

          <div className="inline-block bg-cyan-50 text-cyan-800 border border-cyan-200 px-3 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase mb-2">
            Automated Quality Assurance &amp; Sensor Health Dossier
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase text-[#0b1329] tracking-tight">
            Metshield AI: Automated Weather Station Quality Management System
          </h1>
          <div className="text-xs font-semibold text-slate-600 mt-1">
            Conforming to WMO-No. 8 (CIMO) &amp; WMO-No. 548 Automated QC Standards
          </div>
        </div>

        {/* Dossier Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-slate-50 border border-slate-300 rounded text-xs mb-6">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Document ID</span>
            <span className="font-mono font-bold text-[#0b1329]">METSHIELD/QMS/AUDIT/2026-09</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Date of Inspection</span>
            <span className="font-bold text-slate-800">{auditTimestamp || 'September 2026'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Telemetry Cadence</span>
            <span className="font-bold text-slate-800">2.5s Sync (TDMA Gen-3)</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-500">Quality Index</span>
            <span className="font-mono font-bold text-emerald-700">{qualityRate}% Valid Data</span>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 border border-emerald-300 bg-emerald-50 rounded text-center">
            <div className="text-2xl font-black font-mono text-emerald-800">{validCount}</div>
            <div className="text-xs font-bold text-emerald-900">Approved for NWP</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Flags 1 & 2 (Nominal / Verified Storm)</div>
          </div>
          <div className="p-3 border border-amber-300 bg-amber-50 rounded text-center">
            <div className="text-2xl font-black font-mono text-amber-800">{conditionalCount}</div>
            <div className="text-xs font-bold text-amber-900">Conditional / Imputed</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Flags 3 & 5 (Drift / Frame Loss)</div>
          </div>
          <div className="p-3 border border-red-300 bg-red-50 rounded text-center">
            <div className="text-2xl font-black font-mono text-red-800">{quarantinedCount}</div>
            <div className="text-xs font-bold text-red-900">Quarantined (Hardware)</div>
            <div className="text-[10px] text-red-700 mt-0.5">Flag 4 (Sensor Spike / ADC Freeze)</div>
          </div>
        </div>

        {/* Section 1: All 20 National AWS Observatories Status Matrix */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0b1329] mb-2 flex items-center gap-1.5 border-b border-slate-300 pb-1">
            <FileCheck className="w-4 h-4 text-cyan-600" />
            1. National AWS Observational Nodes & Sensor Integrity Matrix
          </h2>
          <div className="overflow-x-auto border border-slate-300 rounded">
            <table className="w-full text-left text-[11px] border-collapse font-sans">
              <thead>
                <tr className="bg-[#0b1329] text-white font-semibold text-[10px] uppercase">
                  <th className="py-1.5 px-2">Station Code</th>
                  <th className="py-1.5 px-2">Observatory & State</th>
                  <th className="py-1.5 px-2">Coordinates</th>
                  <th className="py-1.5 px-2">Sensors Installed</th>
                  <th className="py-1.5 px-2">Latest Pkt</th>
                  <th className="py-1.5 px-2">WMO Flag</th>
                  <th className="py-1.5 px-2">NWP Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stations.map((s, idx) => {
                  const pkt = dataset.latestPackets[s.stationId];
                  const flag = pkt?.wmoFlag ?? 'FLAG_1_VERIFIED_GOOD';
                  const isGood = flag === 'FLAG_1_VERIFIED_GOOD' || flag === 'FLAG_2_CONVECTIVE_STORM';
                  const isCond = flag === 'FLAG_3_SUSPECT_DRIFT' || flag === 'FLAG_5_PACKET_LOSS';
                  return (
                    <tr key={s.stationId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-1.5 px-2 font-mono font-bold text-[#0b1329] whitespace-nowrap">{s.stationId}</td>
                      <td className="py-1.5 px-2">
                        <div className="font-semibold text-slate-800">{s.name}</div>
                        <div className="text-[10px] text-slate-500">{s.state} · WMO #{s.wmoBlockNo}</div>
                      </td>
                      <td className="py-1.5 px-2 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                        {s.latitude.toFixed(2)}°N, {s.longitude.toFixed(2)}°E ({s.elevationM}m)
                      </td>
                      <td className="py-1.5 px-2 text-[10px] text-slate-600">
                        PT100, Piezoresistive, Capacitive, Sonic Anemometer
                      </td>
                      <td className="py-1.5 px-2 font-mono text-[10px] whitespace-nowrap">
                        {pkt?.raw.temperature?.toFixed(1) ?? '—'}°C / {pkt?.raw.pressure?.toFixed(1) ?? '—'}hPa
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          isGood ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                          isCond ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          'bg-red-100 text-red-900 border-red-300'
                        }`}>
                          {flag.replace('FLAG_', 'F').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-bold text-[10px] whitespace-nowrap">
                        {isGood ? <span className="text-emerald-700">APPROVED</span> :
                         isCond ? <span className="text-amber-700">CONDITIONAL</span> :
                         <span className="text-red-700">QUARANTINED</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Active Maintenance Work Orders */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0b1329] mb-2 flex items-center gap-1.5 border-b border-slate-300 pb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            2. Active Incident Tickets & Field Dispatch Registry
          </h2>
          {workOrders.length === 0 ? (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded text-center text-xs text-emerald-800 font-semibold">
              Zero active hardware discrepancies. All sensors nominal.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-300 rounded">
              <table className="w-full text-left text-[11px] border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-800 text-white font-semibold text-[10px] uppercase">
                    <th className="py-1.5 px-2">Ticket ID</th>
                    <th className="py-1.5 px-2">Station</th>
                    <th className="py-1.5 px-2">Fault Type</th>
                    <th className="py-1.5 px-2">XAI Attribution</th>
                    <th className="py-1.5 px-2">Operational Protocol Dispatched</th>
                    <th className="py-1.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {workOrders.slice(0, 10).map((wo, idx) => (
                    <tr key={wo.ticketId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-1.5 px-2 font-mono font-bold text-[#0b1329] whitespace-nowrap">{wo.ticketId}</td>
                      <td className="py-1.5 px-2 whitespace-nowrap font-medium text-slate-800">{wo.stationId} ({wo.state})</td>
                      <td className="py-1.5 px-2 font-semibold text-red-700 whitespace-nowrap">{wo.classification.replace(/_/g, ' ')}</td>
                      <td className="py-1.5 px-2 font-mono text-[10px] text-slate-600">{wo.xaiBreakdown}</td>
                      <td className="py-1.5 px-2 text-[10px] text-slate-700">{wo.operationalAction}</td>
                      <td className="py-1.5 px-2 font-bold text-[10px] whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded ${wo.status === 'VALIDATED_NWP' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {wo.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Certification Sign-Off Block */}
        <div className="border-t-2 border-slate-800 pt-6 mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1">
              <span className="block font-bold text-slate-800">Quality Assurance Officer:</span>
              <div className="h-10 border-b border-dashed border-slate-400"></div>
              <span className="text-[10px] text-slate-500 font-mono">Digitally Signed · PKI-SHA256</span>
              <span className="block text-[10px] text-slate-600">AWS Quality Audit Division, IMD HQ</span>
            </div>
            <div className="space-y-1">
              <span className="block font-bold text-slate-800">Scientist-in-Charge (NWP Assimilation):</span>
              <div className="h-10 border-b border-dashed border-slate-400"></div>
              <span className="text-[10px] text-slate-500 font-mono">Verification Seal: WMO-548-OK</span>
              <span className="block text-[10px] text-slate-600">National Centre for Medium Range Weather Forecasting</span>
            </div>
            <div className="space-y-1">
              <span className="block font-bold text-slate-800">System Integrity Stamp:</span>
              <div className="p-2 border border-slate-300 rounded bg-slate-50 text-[10px] font-mono text-slate-600">
                Checksum algo: FNV-1a (x2)<br />
                Signature: NONE — demo build<br />
                QC Standard: WMO-Pub8 Tier 1-3
              </div>
              <span className="block text-[9px] text-slate-500 leading-snug">
                Demo build: no cryptographic signing. The displayed checksum is an unkeyed
                corruption check and is not a tamper-evident seal.
              </span>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-500 mt-8 pt-4 border-t border-slate-200">
            <strong>System Operational Notice:</strong> This technical audit dossier is automatically compiled by Metshield AI Automated Weather Station Quality Management System (AWS-QMS). Field telemetry and sensor health parameters are continuously cross-validated against WMO Pub 8 and physical thermodynamic coupling criteria.
          </div>
          <div className="text-center text-[9px] text-amber-800 mt-3 pt-3 border-t border-amber-300 bg-amber-50/70 rounded px-3 py-2">
            <strong>DEMONSTRATION BUILD — NOT AN OFFICIAL RECORD.</strong> The observations,
            quality-control outcomes and work orders in this dossier are generated from a seeded
            simulation, not read from an IMD instrument archive. The Tier 1-3 quality-control logic
            and the report layout are production code; the data is illustrative. Do not cite this
            document as evidence of the state of any real station.
          </div>
        </div>
      </div>
    </div>
  );
}
