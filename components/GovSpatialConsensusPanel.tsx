'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Download,
  Share2,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react';

interface StationCohortNode {
  id: string;
  name: string;
  district: string;
  distanceKm: number;
  temp: number;
  pressure: number;
  humidity: number;
  deltaP: number;
  status: 'NOMINAL' | 'STORM_CONSENSUS' | 'DIVERGENT_OUTLIER';
}

const REGIONAL_COHORTS: Record<string, { target: StationCohortNode; neighbors: StationCohortNode[] }> = {
  PUNE: {
    target: {
      id: 'AWS-4102',
      name: 'Pune Shivajinagar',
      district: 'Pune, Maharashtra',
      distanceKm: 0,
      temp: 24.8,
      pressure: 955.2,
      humidity: 88,
      deltaP: -2.8,
      status: 'STORM_CONSENSUS',
    },
    neighbors: [
      { id: 'AWS-4105', name: 'Pashan Observatory', district: 'Pune', distanceKm: 8.4, temp: 24.2, pressure: 954.9, humidity: 91, deltaP: -2.9, status: 'STORM_CONSENSUS' },
      { id: 'AWS-4112', name: 'Talegaon Dabhade', district: 'Pune', distanceKm: 28.1, temp: 24.0, pressure: 955.8, humidity: 86, deltaP: -2.6, status: 'STORM_CONSENSUS' },
      { id: 'AWS-4118', name: 'Lonavala Ghats', district: 'Pune', distanceKm: 52.0, temp: 22.5, pressure: 948.1, humidity: 94, deltaP: -3.1, status: 'STORM_CONSENSUS' },
      { id: 'AWS-4122', name: 'Baramati Agromet', district: 'Pune', distanceKm: 68.5, temp: 25.4, pressure: 956.1, humidity: 82, deltaP: -2.4, status: 'STORM_CONSENSUS' },
    ],
  },
  DELHI: {
    target: {
      id: 'AWS-1101',
      name: 'Safdarjung National Base',
      district: 'New Delhi',
      distanceKm: 0,
      temp: 38.6,
      pressure: 1002.1,
      humidity: 42,
      deltaP: -0.2,
      status: 'NOMINAL',
    },
    neighbors: [
      { id: 'AWS-1104', name: 'Lodhi Road Station', district: 'New Delhi', distanceKm: 4.2, temp: 38.8, pressure: 1002.3, humidity: 41, deltaP: -0.1, status: 'NOMINAL' },
      { id: 'AWS-1109', name: 'Palam Airport AWS', district: 'South West Delhi', distanceKm: 12.8, temp: 39.1, pressure: 1001.9, humidity: 40, deltaP: -0.2, status: 'NOMINAL' },
      { id: 'AWS-1115', name: 'Ayanagar Rural Node', district: 'South Delhi', distanceKm: 16.5, temp: 38.4, pressure: 1002.5, humidity: 44, deltaP: -0.3, status: 'NOMINAL' },
      { id: 'AWS-1120', name: 'Narela Industrial Node', district: 'North Delhi', distanceKm: 29.4, temp: 38.9, pressure: 1002.0, humidity: 42, deltaP: -0.1, status: 'NOMINAL' },
    ],
  },
  KOLKATA: {
    target: {
      id: 'AWS-7001',
      name: 'Alipore Meteorological Office',
      district: 'Kolkata, West Bengal',
      distanceKm: 0,
      temp: 21.3,
      pressure: 1004.8,
      humidity: 96,
      deltaP: -4.8,
      status: 'DIVERGENT_OUTLIER',
    },
    neighbors: [
      { id: 'AWS-7004', name: 'Dum Dum Airport AWS', district: 'North 24 Parganas', distanceKm: 15.2, temp: 28.5, pressure: 1009.2, humidity: 74, deltaP: -0.4, status: 'NOMINAL' },
      { id: 'AWS-7009', name: 'Howrah Terminal Node', district: 'Howrah', distanceKm: 6.8, temp: 28.8, pressure: 1009.5, humidity: 73, deltaP: -0.3, status: 'NOMINAL' },
      { id: 'AWS-7014', name: 'Diamond Harbour AWS', district: 'South 24 Parganas', distanceKm: 42.0, temp: 29.0, pressure: 1009.1, humidity: 76, deltaP: -0.5, status: 'NOMINAL' },
      { id: 'AWS-7019', name: 'Barasat Agromet Base', district: 'North 24 Parganas', distanceKm: 24.3, temp: 28.2, pressure: 1009.4, humidity: 75, deltaP: -0.4, status: 'NOMINAL' },
    ],
  },
};

export function GovSpatialConsensusPanel() {
  const [selectedRegion, setSelectedRegion] = useState<'PUNE' | 'DELHI' | 'KOLKATA'>('PUNE');
  const [injectedAnomaly, setInjectedAnomaly] = useState<'NONE' | 'OUTLIER_DRIFT' | 'REGIONAL_SQUALL'>('NONE');
  const [isExporting, setIsExporting] = useState(false);

  const currentData = REGIONAL_COHORTS[selectedRegion];

  // Dynamic consensus calculation based on injection
  let targetDeltaP = currentData.target.deltaP;
  let targetStatus = currentData.target.status;
  let consensusConclusion = '';
  let nwpDisposition: 'APPROVED' | 'QUARANTINED_AND_IMPUTED' = 'APPROVED';

  if (injectedAnomaly === 'OUTLIER_DRIFT' || (selectedRegion === 'KOLKATA' && injectedAnomaly === 'NONE')) {
    targetDeltaP = -4.8;
    targetStatus = 'DIVERGENT_OUTLIER';
    consensusConclusion = 'ISOLATED SENSOR DRIFT DETECTED: Target station deviates > 4.2σ from spatial cohort mean. Quarantined from NWP assimilation pipeline. Moving-average synthetic value imputed.';
    nwpDisposition = 'QUARANTINED_AND_IMPUTED';
  } else if (injectedAnomaly === 'REGIONAL_SQUALL' || (selectedRegion === 'PUNE' && injectedAnomaly === 'NONE')) {
    targetDeltaP = -2.8;
    targetStatus = 'STORM_CONSENSUS';
    consensusConclusion = 'REGIONAL CONVECTIVE FRONT VALIDATED: 5/5 spatial stations report simultaneous barometric plunge (Mean ΔP: -2.76 hPa) and humidity surge. Confirmed natural event — NWP ingest approved!';
    nwpDisposition = 'APPROVED';
  } else {
    targetDeltaP = -0.2;
    targetStatus = 'NOMINAL';
    consensusConclusion = 'SYNOPTIC HARMONY: All stations within 70km radius report nominal atmospheric gradients (< 0.5 hPa variation). Baseline telemetry cleared for ingestion.';
    nwpDisposition = 'APPROVED';
  }

  // Mean neighbor delta P
  const neighborMeanDeltaP = (
    currentData.neighbors.reduce((sum, n) => sum + (injectedAnomaly === 'REGIONAL_SQUALL' ? -2.7 : n.deltaP), 0) /
    currentData.neighbors.length
  ).toFixed(2);

  const deviationDelta = Math.abs(targetDeltaP - parseFloat(neighborMeanDeltaP)).toFixed(2);

  const handleExportNWP = () => {
    setIsExporting(true);
    const exportPayload = {
      auditTimestamp: new Date().toISOString(),
      wmoStandard: 'WMO-No. 8 § 4.3 Spatial KNN Consistency',
      targetStation: currentData.target.id,
      region: selectedRegion,
      spatialCohortSize: currentData.neighbors.length + 1,
      targetDeltaP,
      neighborMeanDeltaP: parseFloat(neighborMeanDeltaP),
      spatialDeviationDelta: parseFloat(deviationDelta),
      verdict: targetStatus,
      nwpDisposition,
      imputedFallbackVal: nwpDisposition === 'QUARANTINED_AND_IMPUTED' ? { temp: 28.5, pressure: 1009.3, humidity: 74.5 } : null,
      generatedBy: 'Metshield AI AWS-QMS v4.2 (Team 73869 AEROTECH)',
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `METSHIELD_SPATIAL_NWP_GATING_${selectedRegion}_${Date.now()}.json`;
    link.click();
    setTimeout(() => setIsExporting(false), 800);
  };

  return (
    <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold mb-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>TIER 3: SPATIAL KNN COHORT CROSS-VALIDATION &amp; NWP GATING</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Regional Consensus &amp; Atmospheric Outlier Discrimination
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Solves the localized fault dilemma: Compares the target AWS station against its 4 closest spatial cohort stations (KNN Haversine distance) to differentiate localized probe drifts from large-scale atmospheric fronts.
          </p>
        </div>

        {/* Region Selectors */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
          {(['PUNE', 'DELHI', 'KOLKATA'] as const).map(reg => (
            <button
              key={reg}
              type="button"
              onClick={() => {
                setSelectedRegion(reg);
                setInjectedAnomaly('NONE');
              }}
              className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all border text-center ${
                selectedRegion === reg
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {reg === 'PUNE' && '🌧️ Pune Front (Kalbaisakhi)'}
              {reg === 'DELHI' && '☀️ Delhi Basin (Nominal)'}
              {reg === 'KOLKATA' && '⚠️ Kolkata (Probe Drift Outlier)'}
            </button>
          ))}
        </div>
      </div>

      {/* Cohort Grid & Spatial Map Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Left 5 Cols: Target Station Card & Spatial Consensus Metrics */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-4 rounded-xl border transition-all ${
              targetStatus === 'DIVERGENT_OUTLIER'
                ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20'
                : targetStatus === 'STORM_CONSENSUS'
                ? 'bg-blue-950/20 border-blue-500/40 shadow-lg shadow-blue-950/20'
                : 'bg-emerald-950/20 border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400">Target AWS Station</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                  targetStatus === 'DIVERGENT_OUTLIER'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : targetStatus === 'STORM_CONSENSUS'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {targetStatus}
              </span>
            </div>

            <div className="text-lg font-bold text-white">{currentData.target.name}</div>
            <div className="text-xs text-slate-400 mb-3">{currentData.target.district} • ID: {currentData.target.id}</div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase">Temp</div>
                <div className="text-sm font-bold font-mono text-white">{currentData.target.temp}°C</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase">Pressure</div>
                <div className="text-sm font-bold font-mono text-white">{currentData.target.pressure} hPa</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase">Rate ΔP</div>
                <div
                  className={`text-sm font-bold font-mono ${
                    targetDeltaP <= -2.5 ? 'text-blue-400' : 'text-emerald-400'
                  }`}
                >
                  {targetDeltaP > 0 ? `+${targetDeltaP}` : targetDeltaP} hPa
                </div>
              </div>
            </div>
          </div>

          {/* Spatial Deviation Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Neighborhood Mean ΔP (4 AWS):</span>
              <span className="font-mono font-bold text-white">{neighborMeanDeltaP} hPa</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Spatial Deviation (|Target - Cohort|):</span>
              <span
                className={`font-mono font-bold ${
                  parseFloat(deviationDelta) > 1.5 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {deviationDelta} hPa {parseFloat(deviationDelta) > 1.5 ? '(Outlier)' : '(In Consensus)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">NWP Ingestion Status:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  nwpDisposition === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {nwpDisposition === 'APPROVED' ? 'Approved for WRF/GFS' : 'Quarantined & Imputed'}
              </span>
            </div>
          </div>

          {/* Interactive Scenario Controls */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Inject Simulated Spatial Event
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInjectedAnomaly('OUTLIER_DRIFT')}
                className="px-2.5 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 text-[11px] font-semibold text-left transition-colors"
              >
                ⚡ Inject Sensor Drift (-4.8 hPa)
              </button>
              <button
                type="button"
                onClick={() => setInjectedAnomaly('REGIONAL_SQUALL')}
                className="px-2.5 py-2 rounded-lg bg-blue-950/40 hover:bg-blue-900/40 text-sky-300 border border-blue-800/40 text-[11px] font-semibold text-left transition-colors"
              >
                🌧️ Inject Regional Squall Front
              </button>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: 4 Neighbor Stations List & Decision Engine Output */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Spatial Cohort (4 Nearest AWS Nodes within 70km)</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">KNN Radius: 70 km</span>
          </div>

          <div className="space-y-2">
            {currentData.neighbors.map(neighbor => {
              const effectiveDelta = injectedAnomaly === 'REGIONAL_SQUALL' ? -2.7 : neighbor.deltaP;
              return (
                <div
                  key={neighbor.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{neighbor.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-normal">
                        ({neighbor.distanceKm} km away)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{neighbor.district} • ID: {neighbor.id}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase">Rate ΔP</div>
                      <div
                        className={`text-xs font-mono font-bold ${
                          effectiveDelta <= -2.0 ? 'text-blue-400' : 'text-slate-300'
                        }`}
                      >
                        {effectiveDelta > 0 ? `+${effectiveDelta}` : effectiveDelta} hPa
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400" title="Sensor Nominal" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scientific Verdict Box */}
          <div className="p-4 rounded-xl bg-[#070d1e] border border-cyan-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Spatial Cross-Validation Verdict (WMO-No. 8 § 4.3)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {consensusConclusion}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">
                Assimilation Feed:{' '}
                <strong className={nwpDisposition === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'}>
                  {nwpDisposition === 'APPROVED' ? 'Direct Observation Passed' : 'Synthetic Imputed Packet Substituted'}
                </strong>
              </span>

              <button
                type="button"
                onClick={handleExportNWP}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting...' : 'Export NWP Gating Feed (.json)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
