'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Download,
  Radio,
  RefreshCw,
  Cloud,
  Satellite,
} from 'lucide-react';
import { IMD_AWS_STATIONS } from '@/lib/stationData';
import { nicWmoEngineInstance } from '@/lib/anomalyLogic';
import { crossCheckStation, type CrossCheckResult, type CrossCheckVerdict } from '@/lib/spatialCrossCheck';

/**
 * TIER 3 — INDEPENDENT ATMOSPHERIC CORROBORATION
 *
 * The previous version of this panel was a fiction. It displayed three regions
 * with invented station IDs (AWS-4102 does not exist in `IMD_AWS_STATIONS`),
 * hardcoded temperatures, and buttons labelled "Inject Sensor Drift" that
 * swapped a string in a record and then printed a confident scientific verdict
 * about it — including a "Mean ΔP: -2.76 hPa" computed from literals, and a
 * claim that "5/5 spatial stations report simultaneous barometric plunge" when
 * no station was ever consulted.
 *
 * This version runs the real thing: real stations from the registry, the real
 * anomaly engine, and a real Open-Meteo observation for each station's district.
 * The "inject" button is retained because the fault-arbitration demo is
 * genuinely useful, but it now feeds an offset into the engine's real ingest
 * path and reports what the independent source actually says about it.
 */

const STATIONS = IMD_AWS_STATIONS.filter(s => s.stationId !== 'AWS-MOB-01');

const VERDICT_STYLE: Record<
  CrossCheckVerdict,
  { label: string; card: string; chip: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ATMOSPHERE_CONFIRMS: {
    label: 'Atmosphere confirms',
    card: 'bg-emerald-950/20 border-emerald-500/40',
    chip: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: CheckCircle2,
  },
  STATION_DIVERGES: {
    label: 'Station diverges — probable fault',
    card: 'bg-rose-950/20 border-rose-500/40',
    chip: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    icon: AlertTriangle,
  },
  INDEPENDENT_STORM_CORROBORATION: {
    label: 'Independent storm corroboration',
    card: 'bg-blue-950/20 border-blue-500/40',
    chip: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    icon: Cloud,
  },
  REGIONAL_EXTREME_UNCOUPLED: {
    label: 'Pressure differs, not actionable',
    card: 'bg-amber-950/15 border-amber-500/30',
    chip: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Satellite,
  },
  INSUFFICIENT_DATA: {
    label: 'No independent observation',
    card: 'bg-slate-900/60 border-slate-700',
    chip: 'bg-slate-700/40 text-slate-300 border-slate-600',
    icon: Radio,
  },
};

function fmt(v: number | null | undefined, unit = '', dp = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${v.toFixed(dp)}${unit}`;
}

function BandChip({ band, label, delta }: { band: 'AGREE' | 'DIVERGE' | 'NO_DATA'; label: string; delta: number | null }) {
  const tone =
    band === 'AGREE'
      ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
      : band === 'DIVERGE'
        ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
        : 'text-slate-500 border-slate-700 bg-slate-800/50';
  return (
    <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${tone}`}>
      <span className="text-[10px] font-mono uppercase tracking-wide">{label}</span>
      <span className="text-[11px] font-mono font-bold">
        {delta === null ? band : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`}
      </span>
    </div>
  );
}

export function GovSpatialConsensusPanel({ stationId: initialStationId }: { stationId?: string } = {}) {
  const [stationId, setStationId] = useState(
    () => STATIONS.find(s => s.stationId === initialStationId)?.stationId ?? STATIONS[0]?.stationId ?? ''
  );
  const [result, setResult] = useState<CrossCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faultMode, setFaultMode] = useState(false);
  const [auditTrail, setAuditTrail] = useState<string[]>([]);

  const run = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await crossCheckStation(stationId));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'Cross-check failed');
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    void run();
  }, [run]);

  // The fault demo is a real injection into the engine's ingest path, not a
  // change to what the panel displays. The cross-check then reads the live
  // district and decides, so the verdict below is genuinely independent.
  const toggleFault = useCallback(() => {
    const next = !faultMode;
    setFaultMode(next);
    const station = IMD_AWS_STATIONS.find(s => s.stationId === stationId);
    if (!station) return;

    const b = station.baseline;
    let ts = Date.now();
    const push = (tOff: number) => {
      nicWmoEngineInstance.processIngestedObservation(
        stationId,
        Math.round((b.tempMean + tOff + (Math.random() - 0.5) * 0.6) * 100) / 100,
        Math.round((b.pressureMean + (Math.random() - 0.5) * 0.4) * 10) / 10,
        Math.round((b.humidityMean + (Math.random() - 0.5) * 2) * 10) / 10,
        ts
      );
      ts += 2500;
    };
    for (let i = 0; i < 4; i++) push(0);
    for (let i = 0; i < 3; i++) push(next ? 18 : 0);

    setAuditTrail(a => [
      ...a,
      next
        ? `Injected +18 °C thermistor offset into ${stationId} via processIngestedObservation.`
        : `Cleared the injected offset on ${stationId}.`,
    ]);
  }, [faultMode, stationId]);

  const exportAudit = useCallback(() => {
    if (!result) return;
    const buf = nicWmoEngineInstance.getBuffer(result.stationId);
    const payload = {
      generatedAt: new Date().toISOString(),
      standard: 'WMO-No. 8 — Guide to Meteorological Instruments and Observation',
      module: 'TIER 3 — Independent Atmospheric Corroboration',
      crossCheck: result,
      // Recorded, never consulted. The cross-check verdicts on its own bands so
      // that it stays an independent tiebreak; this column is the evidence that
      // it reached that verdict *without* agreeing with the station-side engine.
      engineVerdictAtCrossCheck: buf.length > 0 ? buf[buf.length - 1].classification : null,
      faultInjected: faultMode,
      auditTrail,
      producedBy: 'MetShield AI AWS-QMS — Team AEROTECH, SIH26073',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `METSHIELD_CROSSCHECK_${result.stationId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, faultMode, auditTrail]);

  const style = result ? VERDICT_STYLE[result.verdict] : VERDICT_STYLE.INSUFFICIENT_DATA;
  const Icon = style.icon;

  const stationRows = useMemo(
    () => STATIONS.map(s => ({ id: s.stationId, label: `${s.stationId} — ${s.name}` })),
    []
  );

  return (
    <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold mb-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>TIER 3: INDEPENDENT ATMOSPHERIC CORROBORATION</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            District Cross-Check &amp; Fault Arbitration
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            A station can only tell you that a reading is inconsistent with itself — a squall and a
            lost barometer zero-point look identical from the inside. This check asks an outside
            source: live Open-Meteo conditions at the station&rsquo;s own district, on mean sea-level
            pressure so no elevation correction is needed. No network, no verdict.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Checking…' : 'Re-check'}</span>
          </button>
          <button
            type="button"
            onClick={exportAudit}
            disabled={!result}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export audit</span>
          </button>
        </div>
      </div>

      {/* Station selector */}
      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <select
          value={stationId}
          onChange={e => {
            setStationId(e.target.value);
            setFaultMode(false);
          }}
          className="flex-1 px-3 py-2 rounded-lg bg-slate-900/80 text-slate-200 border border-slate-700 text-xs font-semibold"
        >
          {stationRows.map(r => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={toggleFault}
          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
            faultMode
              ? 'bg-rose-900/50 text-rose-200 border-rose-700'
              : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
          }`}
        >
          {faultMode ? 'Fault injected — click to clear' : 'Inject +18 °C probe offset'}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-rose-300 border border-rose-800/60 bg-rose-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Verdict + comparison */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`p-4 rounded-xl border transition-all ${style.card}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400">
                Cross-check verdict
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border flex items-center gap-1 ${style.chip}`}>
                <Icon className="w-3 h-3" />
                {result?.verdict ?? '—'}
              </span>
            </div>
            <div className="text-sm font-bold text-white mb-1">{style.label}</div>

            {result ? (
              <>
                {/* Source vs station, side by side. */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/80 mt-3">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase">Station</div>
                    <div className="text-xs font-mono font-bold text-white mt-1">
                      {fmt(result.station.temperature, '°C')}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {fmt(result.station.pressureMsl)} / {fmt(result.station.humidity, '%', 0)}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase">
                      {result.district.name}
                    </div>
                    <div className="text-xs font-mono font-bold text-white mt-1">
                      {fmt(result.district.temperature, '°C')}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {fmt(result.district.pressureMsl)} / {fmt(result.district.humidity, '%', 0)}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase">Separation</div>
                    <div className="text-xs font-mono font-bold text-white mt-1">
                      {result.district.distanceKm} km
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {result.source === 'OPEN_METEO' ? 'Open-Meteo live' : 'no source'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <BandChip band={result.bands.temperature} label="ΔT" delta={result.deltas.temperature} />
                  <BandChip band={result.bands.pressure} label="ΔP" delta={result.deltas.pressure} />
                  <BandChip band={result.bands.humidity} label="ΔRH" delta={result.deltas.humidity} />
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 pt-2">
                {loading ? 'Fetching the live district observation…' : 'No result yet.'}
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#070d1e] border border-cyan-500/30 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>Why</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {result?.rationale ??
                'Run a check to see how the independent source compares to this station.'}
            </p>
          </div>
        </div>

        {/* Provenance + audit */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Source</span>
              <span className="font-mono font-bold text-white">
                {result?.source === 'OPEN_METEO' ? 'Open-Meteo (live)' : 'none'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">District</span>
              <span className="font-mono font-bold text-white text-right">
                {result ? `${result.district.name}, ${result.district.state}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pressure basis</span>
              <span className="font-mono font-bold text-white">MSL, both sides</span>
            </div>
            {result && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Observed</span>
                <span className="font-mono text-slate-300">
                  {new Date(result.observedAt).toLocaleTimeString('en-IN')}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Audit trail
            </span>
            {auditTrail.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No faults injected in this session. Every verdict above is a real comparison against
                a live external observation.
              </p>
            ) : (
              <ul className="space-y-1">
                {auditTrail.map((a, i) => (
                  <li key={i} className="text-[11px] text-slate-400 font-mono">
                    • {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
