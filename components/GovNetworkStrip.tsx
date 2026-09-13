'use client';

import React, { useState } from 'react';
import { Radio, ShieldCheck, AlertCircle, ChevronDown, ChevronUp, Sparkles, Activity, Volume2, VolumeX, CheckCircle2, Brain } from 'lucide-react';

interface Props {
  totalStations: number;
  onlineStations: number;
  qualityIndex: number;
  ingestInterval: string;
  anomalyTally: { critical: number; convective: number; drift: number };
  language: 'hi' | 'en';
  isSoundActive?: boolean;
  onToggleSound?: () => void;
}

export const GovNetworkStrip = React.memo<Props>(function GovNetworkStrip({
  totalStations,
  onlineStations,
  qualityIndex,
  ingestInterval,
  anomalyTally,
  language,
  isSoundActive,
  onToggleSound,
}) {
  const [showMissionBrief, setShowMissionBrief] = useState(false);

  return (
    <div className="w-full bg-white border-b border-slate-200 shadow-xs transition-all duration-300">
      {/* Top Telemetry Status Stream */}
      <div className="max-w-[1750px] mx-auto px-4 lg:px-8 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
        {/* Left: Live Stream Indicator & Network Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span>{language === 'hi' ? 'लाइव वायुमंडलीय फीड' : 'LIVE ATMOSPHERIC STREAM'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[#0b1329] font-semibold flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-600" />
              <span>{totalStations} Observatories ({onlineStations} Online)</span>
            </span>
            <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-emerald-800 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>WMO Pub 8 QC ({qualityIndex.toFixed(1)}% Yield)</span>
            </span>
            <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-900 font-semibold flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-amber-700" />
              <span>{ingestInterval} Ingest</span>
            </span>
            {anomalyTally.critical > 0 ? (
              <span className="bg-rose-50 border border-rose-300 px-2 py-0.5 rounded text-rose-800 font-bold">
                {anomalyTally.critical} Sensor Faults Quarantined
              </span>
            ) : (
              <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                0 Active Hardware Faults
              </span>
            )}
          </div>
        </div>

        {/* Right: Operational Brief Toggle & Alert Chime Toggle */}
        <div className="flex items-center gap-2">
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                isSoundActive
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
              }`}
              title={isSoundActive ? 'Acoustic Alert Chimes Active' : 'Sound Muted'}
            >
              {isSoundActive ? <Volume2 className="w-3.5 h-3.5 text-amber-700 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isSoundActive ? (language === 'hi' ? 'ध्वनि सक्रिय' : 'Sound On') : (language === 'hi' ? 'ध्वनि म्यूट' : 'Muted')}</span>
            </button>
          )}

          <button
            onClick={() => setShowMissionBrief(prev => !prev)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-[#0b1329] border border-slate-300 px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>{language === 'hi' ? 'संचालन संदर्भ' : 'Operational Context'}</span>
            {showMissionBrief ? (
              <ChevronUp className="w-3 h-3 text-slate-500" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Mission Brief Drawer */}
      {showMissionBrief && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 lg:px-8 py-3.5 transition-all duration-300">
          <div className="max-w-[1750px] mx-auto bg-white border border-slate-300 rounded-lg p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-amber-100 border border-amber-200 shrink-0 text-amber-800 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-[#0b1329]">
                    {language === 'hi' ? 'वास्तविक समस्या जिसे प्रोजेक्ट Metshield AI हल करता है:' : 'The Real-World Operational Challenge:'}
                  </span>
                  <span className="text-[10px] bg-cyan-100 text-cyan-800 border border-cyan-300 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    AWS-QMS Telemetry
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed max-w-4xl">
                  {language === 'hi'
                    ? 'मौसम वेधशालाओं में थर्मामीटर के टूटे तार, जमी हुई रीडिंग और बैरोमीटर के ड्रिफ्ट जैसे सेंसर दोष वास्तविक गंभीर तूफानों के साथ भ्रमित हो सकते हैं। Metshield AI विश्व मौसम विज्ञान संगठन (WMO-No. 8) मानकों पर आधारित स्वचालित गुणवत्ता नियंत्रण परत प्रदान करता है, जो वास्तविक तूफान और सेंसर की खराबी में तुरंत अंतर करता है और खराब डेटा को मौसम मॉडल में जाने से रोकता है।'
                    : 'In automated weather networks, broken thermistors, stuck sensors, and drifting barometers mimic genuine storm events. Metshield AI implements automated WMO-No. 8 physical quality control algorithms that immediately discriminate between real severe weather fronts and instrument hardware failures, protecting Numerical Weather Prediction (NWP) models from data corruption.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>NWP Model Gating Active</span>
              </div>
              <div className="bg-sky-50 border border-sky-300 text-[#0b1329] px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-sky-700" />
                <span>Line-Rate &lt;5ms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
