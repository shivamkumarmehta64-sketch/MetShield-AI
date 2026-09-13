'use client';

import React, { useState, useMemo } from 'react';
import { X, Bell, Radio, VolumeX, FileText, Smartphone } from 'lucide-react';
import { TelemetryPacket, generateCapAlert, EmergencyCapAlert } from '@/lib/anomalyLogic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  packet: TelemetryPacket | null;
  stationName: string;
  state: string;
  language: 'hi' | 'en';
  isInline?: boolean;
}

export const GovEmergencyAlertModal: React.FC<Props> = ({
  isOpen,
  onClose,
  packet,
  stationName,
  state,
  language,
  isInline = false,
}) => {
  const [alertType, setAlertType] = useState<'STORM' | 'FAULT'>('STORM');

  const defaultPkt = useMemo<TelemetryPacket>(() => ({
    packetId: 'PKT-ALERT-SAMPLE',
    stationId: 'AWS-DEL-04',
    timestamp: 1789000000000,
    timeIST: '14:32:10 IST',
    raw: { temperature: 27.2, pressure: 998.4, humidity: 92.0, windSpeedKph: 48.0, windDirectionDeg: 270, rainfallMm10min: 14.5 },
    imputed: { temperature: 27.2, pressure: 998.4, humidity: 92.0, windSpeedKph: 48.0, windDirectionDeg: 270, rainfallMm10min: 14.5, wasCorrected: false },
    ratesOfChange: { tempRoC: -3.2, pressRoC: -2.8, humRoC: 22.0, windRoC: 18.0 },
    classification: alertType === 'STORM' ? 'GENUINE_CONVECTIVE_EVENT' : 'SENSOR_SPIKE',
    wmoFlag: alertType === 'STORM' ? 'FLAG_2_CONVECTIVE_STORM' : 'FLAG_4_CORRUPT_HARDWARE',
    alertLevel: alertType === 'STORM' ? 'LEVEL_2_YELLOW' : 'LEVEL_4_RED',
    faultProbability: alertType === 'STORM' ? 0.08 : 0.98,
    xaiAttribution: { tempWeight: 20, pressWeight: 48, humWeight: 32, primaryParameter: 'Pressure', diagnosticNote: 'Convective storm front' },
    operationalAction: 'Dispatched',
    ticketId: 'TKT-ALERT-01',
    securitySeal: { hmacSha256: '0x8f2d...', antiReplayNonce: 104821, auditMerkleRoot: '0x7b...', geofenceStatus: 'VERIFIED_IN_BOUNDS', tamperStatus: 'AUTHENTIC' },
  } as TelemetryPacket), [alertType]);

  if (!isOpen) return null;

  const targetPkt = packet || defaultPkt;

  const cap: EmergencyCapAlert = generateCapAlert(targetPkt, stationName, state);

  return (
    <div className={isInline ? "w-full h-full flex flex-col items-center justify-center p-4 animate-fadeIn" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"}>
      <div className={`bg-white border-2 border-[#002147] rounded-xl shadow-2xl w-full overflow-hidden flex flex-col ${isInline ? 'max-h-full max-w-full h-full' : 'max-w-2xl max-h-[90vh]'}`}>
        {/* Header */}
        <div className="bg-[#002147] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${cap.isSilencedDueToHardwareFault ? 'bg-slate-700 text-slate-300' : 'bg-red-500 text-white animate-pulse'}`}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-wide flex items-center gap-2">
                <span>{language === 'hi' ? 'आपदा चेतावनी प्रणाली सिम्युलेटर (NDMA / CAP प्रोटोकॉल)' : 'Disaster Early Warning Simulator (NDMA / CAP Protocol)'}</span>
              </h2>
              <p className="text-[11px] text-slate-300">
                WMO / ITU Recommendation X.1303 Common Alerting Protocol Broadcast
              </p>
            </div>
          </div>
          {!isInline && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
          {/* Toggle comparison between Storm vs Sensor Fault */}
          <div className="bg-slate-100 p-2 rounded-lg flex items-center justify-between gap-2 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Demonstration Scenario:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAlertType('STORM')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  alertType === 'STORM'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                ⚡ Genuine Severe Storm
              </button>
              <button
                onClick={() => setAlertType('FAULT')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  alertType === 'FAULT'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                ⚠️ Sensor Wire Disconnect
              </button>
            </div>
          </div>

          {/* Real World Impact Banner */}
          {cap.isSilencedDueToHardwareFault ? (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-900">
                <VolumeX className="w-4 h-4 text-emerald-700" />
                <span>False Alarm Siren Inhabited (Citizen Panic Prevented)</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                <strong>False Alarm Prevented:</strong> A broken temperature probe spiked suddenly to 54.8°C.
                Legacy systems would trigger a false heatwave or fire alert. Metshield AI identified the unphysical step and
                silenced the public alert while creating a quiet technician repair ticket.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs text-red-900">
                <Radio className="w-4 h-4 text-red-600 animate-pulse" />
                <span>Genuine Storm Verified: Immediate Civil Defense Alert Broadcast</span>
              </div>
              <p className="text-[11px] text-red-800 leading-relaxed">
                <strong>Civil Defense Trigger:</strong> Barometric pressure plunge (-2.8 hPa) corroborated with 92% humidity surge.
                Validated by spatial neighborhood sensors. Emergency SMS &amp; Siren protocol dispatched to District Collector in &lt;5ms.
              </p>
            </div>
          )}

          {/* CAP XML / JSON Payload Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                CAP-IN Dispatch Record (OASIS / NDMA Compliant):
              </span>
              <span className="font-mono text-slate-500">ID: {cap.alertId}</span>
            </div>

            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg font-mono text-[11px] space-y-1.5 border border-slate-800">
              <div className="text-amber-400 font-bold font-sans text-xs border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>{cap.headline}</span>
                <span className="text-[10px] text-slate-400 font-mono">{cap.sentTime.slice(11, 19)} UTC</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-300 pt-1">
                <div><span className="text-slate-500">Urgency:</span> <strong className="text-white">{cap.urgency}</strong></div>
                <div><span className="text-slate-500">Severity:</span> <strong className="text-white">{cap.severity}</strong></div>
                <div><span className="text-slate-500">Certainty:</span> <strong className="text-white">{cap.certainty}</strong></div>
                <div><span className="text-slate-500">Area:</span> <strong className="text-white truncate block">{cap.areaDesc.split(',')[0]}</strong></div>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-300 leading-relaxed font-sans">
                <strong>Description:</strong> {cap.description}
              </div>
              <div className="text-[10px] text-amber-300 font-sans">
                <strong>Action Instruction:</strong> {cap.instruction}
              </div>
            </div>
          </div>

          {/* Simulated Mobile Push Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-100 text-blue-800">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-800">Civil Mobile Emergency Broadcast (Cell Broadcast Service)</div>
                <div className="text-[10px] text-slate-500">Geo-targeted SMS to citizens within 25km of observatory tower</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
              ✓ Ready for Dispatch
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-2.5 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <span>OASIS CAP v1.2 / ITU-T X.1303 Integrated</span>
          {!isInline && (
            <button
              onClick={onClose}
              className="bg-[#002147] hover:bg-slate-800 text-white px-4 py-1 rounded font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
