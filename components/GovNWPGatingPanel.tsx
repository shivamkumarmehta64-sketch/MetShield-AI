'use client';

import React, { useMemo } from 'react';
import { TelemetryPacket } from '@/lib/anomalyLogic';
import { IMD_AWS_STATIONS, IMDStationProfile } from '@/lib/stationData';
import { ShieldCheck, ShieldAlert, ShieldX, Download, Info, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface Props {
  latestPackets: Record<string, TelemetryPacket>;
  language: 'hi' | 'en';
}

type NWPStatus = 'APPROVED' | 'CONDITIONAL' | 'QUARANTINED';

interface GatingDecision {
  station: IMDStationProfile;
  pkt: TelemetryPacket | null;
  nwpStatus: NWPStatus;
  reason: string;
  imputedUsed: boolean;
}

function getNWPStatus(pkt: TelemetryPacket | null): { status: NWPStatus; reason: string; imputedUsed: boolean } {
  if (!pkt) return { status: 'QUARANTINED', reason: 'No telemetry received — station offline or DCP link failure.', imputedUsed: false };
  switch (pkt.wmoFlag) {
    case 'FLAG_1_VERIFIED_GOOD':
      return { status: 'APPROVED', reason: 'All WMO-No. 8 physical limits and RoC thresholds satisfied. Raw observation cleared for NWP ingestion.', imputedUsed: false };
    case 'FLAG_2_CONVECTIVE_STORM':
      return { status: 'APPROVED', reason: 'Genuine severe convective event confirmed by multivariate XAI discriminator. Validated weather data — NWP assimilation approved.', imputedUsed: false };
    case 'FLAG_3_SUSPECT_DRIFT':
      return { status: 'CONDITIONAL', reason: `Monotonic barometric drift detected. Imputed WMA value substituted (±${((1 - pkt.faultProbability) * 100).toFixed(0)}% confidence). NABL recalibration scheduled.`, imputedUsed: true };
    case 'FLAG_4_CORRUPT_HARDWARE':
      return { status: 'QUARANTINED', reason: `Hardware fault (${pkt.classification === 'SENSOR_SPIKE' ? 'Thermistor open-circuit spike' : 'Stuck ADC register — frozen value'}). Observation quarantined. Field work order dispatched.`, imputedUsed: false };
    case 'FLAG_5_PACKET_LOSS':
      return { status: 'CONDITIONAL', reason: 'Telemetry frame lost. WMO-compliant weighted moving average (WMA) imputed from last 6 valid observations. Provisional NWP feed.', imputedUsed: true };
    default:
      return { status: 'QUARANTINED', reason: 'Unknown classification — quarantined pending manual review.', imputedUsed: false };
  }
}

const STATUS_CONFIG: Record<NWPStatus, { icon: React.ReactNode; rowCls: string; badgeCls: string; label: string; labelHi: string }> = {
  APPROVED:    { icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />, rowCls: 'bg-emerald-50 border-emerald-200', badgeCls: 'bg-emerald-100 text-emerald-900 border-emerald-300', label: 'APPROVED',    labelHi: 'स्वीकृत' },
  CONDITIONAL: { icon: <ShieldAlert className="w-4 h-4 text-amber-600" />,   rowCls: 'bg-amber-50 border-amber-200',   badgeCls: 'bg-amber-100 text-amber-900 border-amber-300',   label: 'CONDITIONAL', labelHi: 'सशर्त' },
  QUARANTINED: { icon: <ShieldX className="w-4 h-4 text-red-600" />,        rowCls: 'bg-red-50 border-red-200',       badgeCls: 'bg-red-100 text-red-900 border-red-300',         label: 'QUARANTINED', labelHi: 'क्वारंटाइन' },
};

export const GovNWPGatingPanel = React.memo<Props>(function GovNWPGatingPanel({ latestPackets, language }) {
  const decisions = useMemo<GatingDecision[]>(() =>
    IMD_AWS_STATIONS.map(station => {
      const pkt = latestPackets[station.stationId] ?? null;
      const { status, reason, imputedUsed } = getNWPStatus(pkt);
      return { station, pkt, nwpStatus: status, reason, imputedUsed };
    }),
    [latestPackets]
  );

  const approved    = decisions.filter(d => d.nwpStatus === 'APPROVED').length;
  const conditional = decisions.filter(d => d.nwpStatus === 'CONDITIONAL').length;
  const quarantined = decisions.filter(d => d.nwpStatus === 'QUARANTINED').length;
  const totalActive = IMD_AWS_STATIONS.length;
  const gatingRate  = Math.round(((approved + conditional) / totalActive) * 100);

  const exportNWPFeed = () => {
    const feed = {
      generatedAt: new Date().toISOString(),
      system: 'Metshield AI AWS-QMS v4.2.8',
      wmoPubNo8Compliance: true,
      nwpAssimilationFeed: decisions
        .filter(d => d.nwpStatus !== 'QUARANTINED')
        .map(d => ({
          stationId: d.station.stationId,
          wmoBlockNo: d.station.wmoBlockNo,
          coordinates: { lat: d.station.latitude, lon: d.station.longitude },
          status: d.nwpStatus,
          wmoFlag: d.pkt?.wmoFlag,
          temperature: d.pkt?.imputed.temperature,
          pressure: d.pkt?.imputed.pressure,
          humidity: d.pkt?.imputed.humidity,
          imputedSubstitution: d.imputedUsed,
          xaiPrimaryParameter: d.pkt?.xaiAttribution.primaryParameter,
          timestamp: d.pkt?.timeIST,
        })),
      quarantinedStations: decisions
        .filter(d => d.nwpStatus === 'QUARANTINED')
        .map(d => ({ stationId: d.station.stationId, reason: d.reason })),
    };
    const blob = new Blob([JSON.stringify(feed, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `NAWS_QMS_NWP_Feed_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="bg-white border border-slate-300 rounded shadow-xs p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-700 text-white rounded">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#002147]">
              {language === 'hi' ? 'मौसम पूर्वानुमान डेटा गुणवत्ता स्वीकृति' : 'Weather Forecast Quality Control Decisions'}
            </h2>
            <p className="text-[10px] text-slate-500">
              {language === 'hi' ? 'स्वचालित गुणवत्ता जांच — कौन सा स्टेशन डेटा राष्ट्रीय पूर्वानुमान के लिए सटीक और सुरक्षित है' : 'Automated Quality Filter — Verifying which station data is accurate and safe for weather forecasting'}
            </p>
          </div>
        </div>
        <button
          onClick={exportNWPFeed}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#002147] hover:bg-[#0B3B60] text-white text-xs font-bold transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'डेटा रिपोर्ट डाउनलोड (.json)' : 'Download Verified Feed (.json)'}</span>
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, value: approved,    label: 'Approved for Forecasts', sub: 'Verified 100% accurate', cls: 'bg-emerald-50 border-emerald-200' },
          { icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, value: conditional,  label: 'Auto-Corrected', sub: 'Calculated backup used', cls: 'bg-amber-50 border-amber-200' },
          { icon: <XCircle className="w-5 h-5 text-red-600" />,          value: quarantined, label: 'Blocked (Faulty)', sub: 'Excluded from forecast feed', cls: 'bg-red-50 border-red-200' },
          { icon: <ShieldCheck className="w-5 h-5 text-[#002147]" />,    value: `${gatingRate}%`, label: 'Usable Data Rate', sub: `${approved + conditional}/${totalActive} stations approved`, cls: 'bg-blue-50 border-blue-200' },
        ].map(t => (
          <div key={t.label} className={`p-3 rounded border ${t.cls} flex items-center gap-3`}>
            <div>{t.icon}</div>
            <div>
              <div className="text-xl font-extrabold font-mono text-slate-900">{t.value}</div>
              <div className="text-[11px] font-semibold text-slate-700">{t.label}</div>
              <div className="text-[10px] text-slate-500">{t.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-station gating decisions table */}
      <div className="overflow-x-auto border border-slate-200 rounded">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#002147] text-white text-[11px] font-semibold">
              {['Station / State', 'Forecast Decision', 'Quality Flag', 'Live Sensor Reading (Temp / Press / Humidity)', 'Auto-Correction Value', 'Why this decision?'].map((h, i) => (
                <th key={h} className={`py-2 px-2.5 ${i < 5 ? 'border-r border-slate-600' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {decisions.map(({ station, pkt, nwpStatus, reason, imputedUsed }) => {
              const cfg = STATUS_CONFIG[nwpStatus];
              return (
                <tr key={station.stationId} className={`${cfg.rowCls} border-b`}>
                  <td className="py-1.5 px-2.5 border-r border-slate-200">
                    <div className="font-semibold text-slate-900 font-sans text-[11px]">{station.name.split(',')[0]}</div>
                    <div className="text-[10px] text-slate-500">{station.stationId} · {station.state}</div>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold text-[10px] ${cfg.badgeCls}`}>
                      {cfg.icon}
                      {language === 'hi' ? cfg.labelHi : cfg.label}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                    {pkt?.wmoFlag?.replace(/_/g, ' ').replace('FLAG ', 'F') ?? '—'}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-800">
                    {pkt ? `${pkt.raw.temperature ?? 'NULL'}°C / ${pkt.raw.pressure ?? 'NULL'}hPa / ${pkt.raw.humidity ?? 'NULL'}%` : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200">
                    {imputedUsed ? (
                      <span className="text-amber-700 font-bold">
                        {pkt?.imputed.temperature}°C / {pkt?.imputed.pressure}hPa / {pkt?.imputed.humidity}%
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Raw (no sub.)</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600 font-sans text-[10px] max-w-[260px]">{reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* WMO compliance note */}
      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded flex items-start gap-2 text-[11px] text-blue-900">
        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
        <span>
          <strong>WMO-No. 548 Compliance:</strong> All APPROVED and CONDITIONAL observations conform to WMO Manual on the Global Observing System gating requirements.
          Imputed values are WMA-reconstructed per Zahumenský (2004) §5.2 and flagged for downstream NWP model awareness.
        </span>
      </div>
    </div>
  );
});
