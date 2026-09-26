'use client';

/**
 * StormVsFaultSimulator
 * =====================
 * The page's headline claim, made checkable.
 *
 * A legacy QC rule quarantines a station whenever pressure drops far enough to
 * look impossible, which means it also quarantines every real squall. This
 * panel exists to show that the claim is true — and the only way to do that is
 * to stop narrating it and start *running* it. Everything below the scenario
 * buttons is the engine's own output and a live outside opinion about it.
 *
 * Three rules govern what may appear on this panel, and they are why the
 * earlier version of this file had to be rewritten rather than edited:
 *
 *  1. The engine is driven through `processIngestedObservation` — the same
 *     entry point the API route and the benchmark use — and fed explicit raw
 *     (T, P, RH, W) sequences. The engine's `trigger*` methods are a bench
 *     hook: they set a flag that only the packet *generator* reads, so a
 *     deployment never calls them. Demonstrating the engine through a testing
 *     hook demonstrates something a deployment does not do.
 *
 *  2. No scenario's expected classification is a label to match. The engine's
 *     thresholds decide the class, and if a sequence fails to produce its
 *     expected class the sequence is wrong and gets fixed. Special-casing the
 *     display would render a panel that looks correct while the engine
 *     disagrees underneath — which is precisely the defect being removed.
 *
 *  3. Nothing here is invented. There is no confidence scalar, because the
 *     engine has none: the old "97.4% AI confidence" was a hand-typed number
 *     with no model behind it. There is no SHAP block, because there is no
 *     SHAP model in this repository. There is no kriging mesh, because there
 *     is no kriging here. What is displayed instead is the evidence that
 *     exists: the classification, the WMO flag, the channels that actually
 *     moved, the engine's own recommended action, and an independent opinion
 *     fetched live from Open-Meteo.
 *
 * The `faultProbability` and `mlConfidence` fields the packet carries are
 * deliberately not rendered either. Both are hardcoded literals inside
 * `evaluate()`, assigned per classification branch rather than computed, so
 * displaying them would put an unearned number on screen under a borrowed
 * name.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Snowflake, TrendingUp, Wind, AlertTriangle, ShieldCheck, Sparkles, Brain, Activity,
  Thermometer, Gauge, Droplets, RefreshCw, Cpu, Radio, Satellite,
} from 'lucide-react';
import { NICWMOAnomalyEngine, TelemetryPacket, RootCauseClassification } from '@/lib/anomalyLogic';
import { getStationProfile, IMDStationProfile } from '@/lib/stationData';
import { crossCheckStation, CrossCheckResult, CrossCheckVerdict } from '@/lib/spatialCrossCheck';
import { latencyPerTickMs, benchmarkConditions, SYNTHETIC_SUITE_LABEL } from '@/lib/benchmarkResults';

// ── Scenario definitions ──────────────────────────────────────────────────

/** One raw observation, in the units a real AWS reports. */
interface Sample {
  temperature: number;
  pressure: number;
  humidity: number;
  windKph: number;
}

interface ScenarioDef {
  id: ScenarioId;
  label: string;
  shortDesc: string;
  icon: React.ReactNode;
  badgeColor: string;
  stationId: string;
  /**
   * How many nominal ticks to lay down before the fault begins.
   *
   * This is the most important number in the file. Every verdict the engine
   * reaches is latched, not instantaneous: the drift rule needs three
   * consecutive ticks outside tolerance, the freeze rule needs six identical
   * readings, and both the slow-reference EMA and the rolling pressure window
   * have to be primed from a settled baseline first. A single injected sample
   * measures none of that — it measures how the engine reacts to a cold
   * buffer, which is not what a deployment sees.
   */
  warmupTicks: number;
  /** Length of the fault. Chosen from the latch, not for convenience. */
  faultTicks: number;
  /** Fixed PRNG seed, so the panel shows the same run on every render. */
  seed: number;
  /**
   * The fault itself: raw readings, not an instruction to the engine. A
   * scenario is a physical story about a probe, and it has to be expressible
   * as numbers on four channels for the engine to have anything to judge.
   */
  fault: (baseline: IMDStationProfile['baseline'], i: number, rnd: () => number) => Sample;
}

type ScenarioId = 'spike' | 'stuck' | 'drift' | 'storm';

const TICK_MS = 2500;

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'spike',
    label: '🚨 Sensor Spike',
    shortDesc: 'Open-circuit thermistor, full scale',
    icon: <Zap className="w-4 h-4" />,
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    stationId: 'AWS-DEL-04',
    warmupTicks: 6,
    // The spike latch decays over four ticks, so four is the length at which
    // the fault is still being held on the final sample.
    faultTicks: 4,
    seed: 0x5f3a,
    // >50 °C on a 31.8 °C Delhi July afternoon. Every channel is plausible
    // except temperature, and temperature is alone — nothing about the
    // pressure or humidity moves with it. The random spread is deliberate:
    // a perfectly constant reading is a frozen ADC, which is a different
    // fault with a different work order, and the engine correctly says so.
    fault: (b, _i, rnd) => ({
      temperature: 53 + rnd() * 3.5,
      pressure: b.pressureMean,
      humidity: b.humidityMean,
      windKph: b.windMean ?? 22,
    }),
  },
  {
    id: 'stuck',
    label: '🥶 Stuck ADC',
    shortDesc: 'Frozen register, zero variance',
    icon: <Snowflake className="w-4 h-4" />,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    stationId: 'AWS-CHN-03',
    warmupTicks: 6,
    // The engine counts the current tick plus the previous five, so the sixth
    // fault tick is the first one it can call frozen. Seven is the length at
    // which the diagnosis is established rather than pending.
    faultTicks: 7,
    seed: 0x2c71,
    // The whole register latches: every channel repeats one value, byte for
    // byte, while the atmosphere around Chennai moves on.
    fault: (b) => ({
      temperature: 32.5,
      pressure: b.pressureMean,
      humidity: b.humidityMean,
      windKph: b.windMean ?? 20,
    }),
  },
  {
    id: 'drift',
    label: '📈 Sensor Drift',
    shortDesc: 'Barometer zero-point walking off',
    icon: <TrendingUp className="w-4 h-4" />,
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    stationId: 'AWS-PUN-08',
    warmupTicks: 8,
    // Pressure walks 0.5 hPa per tick. Nothing about it is a step, so nothing
    // but the residual against a slow reference can see it; the reference
    // needs the long warm-up and the latch needs three more ticks on top.
    faultTicks: 10,
    seed: 0x7bd4,
    fault: (b, i, rnd) => ({
      // The healthy channels keep breathing. Holding them perfectly still
      // would read as a second, unrelated fault and would mask the one under
      // demonstration.
      temperature: b.tempMean + (rnd() - 0.5) * 0.6,
      pressure: b.pressureMean + 0.5 * (i + 1),
      humidity: b.humidityMean + (rnd() - 0.5) * 2,
      windKph: b.windMean ?? 16,
    }),
  },
  {
    id: 'storm',
    label: '⛈️ Severe Storm',
    shortDesc: 'Coupled T / P / RH collapse',
    icon: <Wind className="w-4 h-4" />,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    stationId: 'AWS-KOL-02',
    warmupTicks: 6,
    // The first two ticks move but have not yet crossed every threshold
    // together; the engine only arms on the third. Six is enough for the
    // event to be established and then held.
    faultTicks: 6,
    seed: 0x1a2b,
    // What separates this from a broken barometer is that the channels move
    // *together and in the right relationship*: pressure plunges, humidity
    // rises into saturation, temperature falls with evaporative cooling, wind
    // backs in. A faulty instrument produces one channel moving alone.
    fault: (b, i) => ({
      temperature: b.tempMean - 1.2 * (i + 1),
      pressure: b.pressureMean - 2.0 * (i + 1),
      humidity: Math.min(97.5, b.humidityMean + 5.0 * (i + 1)),
      windKph: (b.windMean ?? 24) + 12 * (i + 1),
    }),
  },
];

// ── Deterministic jitter ──────────────────────────────────────────────────

/**
 * A seeded PRNG, not `Math.random()`.
 *
 * The panel has to be reproducible twice over. React renders it more than
 * once — StrictMode double-invokes effects, and every keystroke that changes
 * state re-renders — so an unseeded sequence would show the judge a different
 * run each time, and a nominal tick that happened to jitter by enough could
 * arm or disarm a latch. A fixed seed per scenario means the numbers on
 * screen are the numbers that were traced and verified.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A healthy station near its climatological baseline.
 *
 * The registry's `baseline` is a monthly mean, not a reading, so it is jittered
 * rather than used flat: a perfectly constant nominal run is indistinguishable
 * from a frozen register and the engine is right to distrust it.
 */
function nominalSample(baseline: IMDStationProfile['baseline'], rnd: () => number): Sample {
  return {
    temperature: baseline.tempMean + (rnd() - 0.5) * 0.6,
    pressure: baseline.pressureMean + (rnd() - 0.5) * 0.4,
    humidity: baseline.humidityMean + (rnd() - 0.5) * 2,
    windKph: baseline.windMean ?? 18,
  };
}

/** Rounded to the precision a datalogger would report, before the engine sees it. */
function toEngine(s: Sample): [number, number, number, number] {
  return [
    Math.round(s.temperature * 100) / 100,
    Math.round(s.pressure * 10) / 10,
    Math.round(s.humidity * 10) / 10,
    Math.round(s.windKph * 10) / 10,
  ];
}

// ── Driving the engine ────────────────────────────────────────────────────

interface ScenarioRun {
  /** Every tick fed in, in order — this is what the panel's trace shows. */
  ticks: { label: string; sample: Sample; packet: TelemetryPacket }[];
  final: TelemetryPacket;
}

/**
 * Replays a scenario through the real ingest path.
 *
 * Synchronous by design. The whole sequence is fourteen or seventeen cheap
 * calls, and doing it inline means the engine verdict and the reading the
 * cross-check is asked to arbitrate about can never be two different packets —
 * a race here would produce a panel that shows a verdict about data the
 * operator is no longer looking at.
 */
function runScenario(scenario: ScenarioDef): ScenarioRun {
  const station = getStationProfile(scenario.stationId);

  // A private engine, not the module-level singleton. The singleton is shared
  // with the rest of the app, so replaying a scenario into it would leave this
  // station's latches set for whatever else reads that station next. The
  // packet is handed to the cross-check explicitly below so nothing has to
  // read the engine's buffer at all.
  const engine = new NICWMOAnomalyEngine();
  engine.resetToNominal(scenario.stationId);

  const rnd = mulberry32(scenario.seed);
  const ticks: ScenarioRun['ticks'] = [];

  // Timestamps are synthetic and spaced on a fixed cadence. The engine reads
  // them only to format a clock and to derive the security seal's nonce, so
  // the epoch does not need to be real — but the spacing does, because the
  // tick rate is what gives "a rise of X °C in under five seconds" its
  // meaning.
  let ts = 0;
  const push = (label: string, sample: Sample) => {
    const [t, p, h, w] = toEngine(sample);
    const packet = engine.processIngestedObservation(scenario.stationId, t, p, h, ts, w, null, 0);
    ticks.push({ label, sample, packet });
    ts += TICK_MS;
  };

  for (let i = 0; i < scenario.warmupTicks; i++) {
    push(`n${i}`, nominalSample(station.baseline, rnd));
  }
  for (let i = 0; i < scenario.faultTicks; i++) {
    push(`f${i}`, scenario.fault(station.baseline, i, rnd));
  }

  return { ticks, final: ticks[ticks.length - 1].packet };
}

// ── Presentation helpers ──────────────────────────────────────────────────

function signed(v: number): string {
  return (v > 0 ? '+' : '') + v.toFixed(1);
}

/**
 * Which verdicts are the atmosphere and which are the instrument. Only used
 * to choose a colour — the class and the flag beside it are what the engine
 * actually said.
 */
const GENUINE_CLASSES: ReadonlySet<RootCauseClassification> = new Set<RootCauseClassification>([
  'GENUINE_CONVECTIVE_EVENT',
]);

/** The badge on each scenario button: what is being demonstrated, not what the engine returned. */
const SCENARIO_INTENT: Record<ScenarioId, 'GENUINE' | 'FAULT'> = {
  spike: 'FAULT',
  stuck: 'FAULT',
  drift: 'FAULT',
  storm: 'GENUINE',
};

const VERDICT_TONE: Record<CrossCheckVerdict, string> = {
  ATMOSPHERE_CONFIRMS: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  INDEPENDENT_STORM_CORROBORATION: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  STATION_DIVERGES: 'bg-rose-950 text-rose-400 border-rose-800',
  REGIONAL_EXTREME_UNCOUPLED: 'bg-slate-800 text-slate-300 border-slate-700',
  INSUFFICIENT_DATA: 'bg-slate-800 text-slate-400 border-slate-700',
};

const BAND_TONE = {
  AGREE: 'text-emerald-400',
  DIVERGE: 'text-rose-400',
  NO_DATA: 'text-slate-500',
} as const;

/**
 * Traffic-light framing for a per-tick classification, expressed once so the
 * trace and the verdict card cannot drift apart.
 */
function classTone(cls: RootCauseClassification): { wrap: string; icon: string } {
  if (GENUINE_CLASSES.has(cls)) {
    return { wrap: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200', icon: 'bg-emerald-500/20 border-emerald-400 text-emerald-400' };
  }
  if (cls === 'NOMINAL_OPERATION') {
    return { wrap: 'bg-slate-800 border-slate-600 text-slate-200', icon: 'bg-slate-700/50 border-slate-500 text-slate-400' };
  }
  return { wrap: 'bg-rose-950/80 border-rose-500/50 text-rose-200', icon: 'bg-rose-500/20 border-rose-400 text-rose-400' };
}

export function StormVsFaultSimulator() {
  const [selectedId, setSelectedId] = useState<ScenarioId>('spike');
  /**
   * Every cross-check outcome carries the run it was fetched for.
   *
   * `crossCheckStation` is a live HTTP call to Open-Meteo, so it is fetched
   * in an effect and lands some time after the engine verdict is already on
   * screen. Keying the result to the run rather than clearing it on every
   * scenario change is what stops the panel from ever showing a district
   * opinion about a reading the operator is no longer looking at: if the run
   * has moved on, the stored result simply stops matching and the panel shows
   * its pending state instead.
   */
  const [crossCheck, setCrossCheck] = useState<{ run: ScenarioRun; result: CrossCheckResult } | null>(null);
  const [checkError, setCheckError] = useState<{ run: ScenarioRun; message: string } | null>(null);

  const currentCase = useMemo(
    () => SCENARIOS.find((s) => s.id === selectedId) ?? SCENARIOS[0],
    [selectedId]
  );

  /**
   * The scenario run is a pure function of the scenario, so it is derived
   * during render rather than pushed through state from an effect. That also
   * removes a whole class of bug: an effect fires *after* paint, which is
   * enough for one frame to show the previous scenario's verdict under the new
   * scenario's heading.
   *
   * It is synchronous and cheap, and `runScenario` builds a private engine, so
   * memoising on the scenario object is sufficient — the reference only
   * changes when the operator picks a different scenario.
   */
  const run = useMemo(() => runScenario(currentCase), [currentCase]);
  const packet = run.final;
  const ticks = run.ticks;

  // The one genuinely external thing here, and the only reason an effect is
  // needed: it fetches, and a render must not.
  useEffect(() => {
    let current = true;
    crossCheckStation(run.final.stationId, run.final)
      .then((result) => {
        if (current) setCrossCheck({ run, result });
      })
      .catch((err: unknown) => {
        // `crossCheckStation` absorbs its own provider failures and returns an
        // INSUFFICIENT_DATA result, so reaching here means something else
        // went wrong. The honest response is to say so, not to render a
        // plausible district reading that was never fetched.
        if (current) setCheckError({ run, message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      current = false;
    };
  }, [run]);

  const activeCheck = crossCheck?.run === run ? crossCheck.result : null;
  const activeCheckError = checkError?.run === run ? checkError.message : null;

  const station = useMemo(() => getStationProfile(currentCase.stationId), [currentCase.stationId]);

  /**
   * Which channels actually moved, against their own baseline.
   *
   * This replaces the SHAP attribution bar the panel used to carry. Those bars
   * were four hand-tuned integers per scenario, labelled as the output of a
   * model that does not exist in this repository. This measures the same
   * thing honestly: the residual between the last reading and the station's own
   * climatological baseline, which is the physical statement the engine is
   * actually reasoning about. It is computed in this file from values the
   * packet carries — nothing is imported, and nothing is claimed about how the
   * engine weighted the channels internally, because the engine does not say.
   */
  const divergences = useMemo(() => {
    if (!packet) return null;
    const b = station.baseline;
    // These three scenarios all report on every channel — a null anywhere is
    // the packet-loss fault, which none of them produce. The guard keeps the
    // compiler honest rather than hiding behind a non-null assertion.
    if (packet.raw.temperature === null || packet.raw.pressure === null || packet.raw.humidity === null) {
      return null;
    }
    const dT = packet.raw.temperature - b.tempMean;
    const dP = packet.raw.pressure - b.pressureMean;
    const dH = packet.raw.humidity - b.humidityMean;
    return [
      { channel: 'Temperature', symbol: 'T', value: dT, unit: '°C', tone: 'text-rose-400' },
      { channel: 'Pressure', symbol: 'P', value: dP, unit: 'hPa', tone: 'text-sky-400' },
      { channel: 'Humidity', symbol: 'RH', value: dH, unit: '%', tone: 'text-blue-400' },
    ];
  }, [packet, station]);

  const tone = packet ? classTone(packet.classification) : null;

  return (
    <div className="w-full bg-[#0b1329] border border-cyan-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 mb-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>REAL-TIME DISCRIMINATOR ENGINE</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            Severe Storm vs Sensor Fault Discriminator
          </h3>
          <p className="text-xs text-slate-400">
            Each scenario replays a fixed sequence of raw readings through the production ingest path.
            The classification, flag and action below are the engine&apos;s own output, and the district
            cross-check is an independent opinion fetched live from Open-Meteo.
          </p>
          <p className="text-[10px] text-slate-500 mt-1 italic max-w-xl hidden sm:block">
            {SYNTHETIC_SUITE_LABEL}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-right font-mono text-[11px] group relative">
          <span className="text-slate-400 block text-[9px] uppercase font-bold">Measured Classify Cost · p95</span>
          <span className="text-cyan-400 font-bold">{latencyPerTickMs.p95.toFixed(3)}ms p95</span>
          <span className="text-slate-500 block text-[9px]">
            {benchmarkConditions.runtime} · {benchmarkConditions.platform}
          </span>
          {/* Tooltip for conditions */}
          <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-800 border border-slate-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-left text-[10px] text-slate-300 pointer-events-none">
             Measured offline ({benchmarkConditions.measured})<br/>
             <span className="text-cyan-300">{benchmarkConditions.runtime} on {benchmarkConditions.platform}</span><br/>
             <span className="text-slate-400 mt-2 block pt-2 border-t border-slate-700 leading-tight">{benchmarkConditions.note}</span>
          </div>
        </div>
      </div>

      {/* 4 Interactive Test Scenario Selector Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
        {SCENARIOS.map(tc => {
          const isSelected = tc.id === selectedId;
          return (
            <button
              key={tc.id}
              onClick={() => setSelectedId(tc.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-base flex items-center">{tc.icon}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${tc.badgeColor}`}>
                  {SCENARIO_INTENT[tc.id]}
                </span>
              </div>
              <div className="font-bold text-xs text-white">{tc.label}</div>
              <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{tc.shortDesc}</div>

              {isSelected && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-cyan-400 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Interactive Result Dashboard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCase.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4"
        >
          {/* Left Column: Ingested Reading & Classification */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Last Ingested Tick
              </span>
              <span className="text-[10px] font-mono text-slate-500">T + P + RH + W</span>
            </div>

            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
              {station.name}, {station.state} · {currentCase.stationId} ·{' '}
              {currentCase.warmupTicks} nominal ticks then {currentCase.faultTicks} fault ticks,
              {' '}{TICK_MS / 1000}s apart
            </p>

            {/* Input Parameter Cards */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-1">
                  <Thermometer className="w-3 h-3 text-rose-400" /> Temp
                </div>
                <div className="font-bold text-white text-sm">{packet?.raw.temperature != null ? `${packet.raw.temperature.toFixed(1)}°C` : '--'}</div>
                <div className="text-[9px] text-amber-400 mt-0.5 leading-tight">
                  {packet ? `Δt ${signed(packet.ratesOfChange.tempRoC)}°` : '--'}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-1">
                  <Gauge className="w-3 h-3 text-sky-400" /> Pressure
                </div>
                <div className="font-bold text-white text-sm">{packet?.raw.pressure != null ? `${packet.raw.pressure.toFixed(1)}hPa` : '--'}</div>
                <div className="text-[9px] text-cyan-400 mt-0.5 leading-tight">
                  {packet ? `Δt ${signed(packet.ratesOfChange.pressRoC)}hPa` : '--'}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-1">
                  <Droplets className="w-3 h-3 text-blue-400" /> Humidity
                </div>
                <div className="font-bold text-white text-sm">{packet?.raw.humidity != null ? `${packet.raw.humidity.toFixed(1)}%` : '--'}</div>
                <div className="text-[9px] text-purple-400 mt-0.5 leading-tight">
                  {packet ? `Δt ${signed(packet.ratesOfChange.humRoC)}%` : '--'}
                </div>
              </div>
            </div>

            {/* Classification Outcome Card */}
            {packet && tone && (
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${tone.wrap}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${tone.icon}`}>
                    {GENUINE_CLASSES.has(packet.classification) ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Engine Verdict</div>
                    <div className="font-black text-sm text-white max-w-[200px] truncate" title={packet.classification}>
                      {packet.classification.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[10px] font-mono text-slate-300">{packet.wmoFlag}</div>
                  </div>
                </div>
                {packet.ticketId && (
                  <div className="text-right">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Work Order</div>
                    <div className="text-[10px] font-mono text-slate-200">{packet.ticketId}</div>
                  </div>
                )}
              </div>
            )}

            {packet && (
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                {packet.alertLevel} · alert level as assigned by the engine
              </p>
            )}
          </div>

          {/* Right Column: Engine Evidence & Cross-Check */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4 flex flex-col">
            {/* Engine's own recommended action */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 mb-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span>Engine Recommended Action:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-sans min-h-[60px]">
                {packet ? `“${packet.operationalAction}”` : 'Running sequence…'}
              </p>
            </div>

            {/* What actually moved — the real replacement for the SHAP block */}
            {divergences && (
              <div>
                <div className="text-[11px] font-bold text-slate-400 mb-2">
                  Channels that moved against this station&apos;s own baseline
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  {divergences.map(d => (
                    <div key={d.channel} className="bg-slate-950 rounded-lg border border-slate-800 px-2.5 py-2">
                      <span className="text-slate-500 block mb-0.5">{d.channel}</span>
                      <span className={d.tone}>{signed(d.value)} {d.unit}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  Residual of the last reading against {station.name}&apos;s climatological baseline.
                  This is what the engine&apos;s thresholds are applied to, not a model attribution.
                </p>
              </div>
            )}

            {/* Per-tick sequence — the real receipts for the verdict above */}
            {ticks.length > 0 && (
              <div>
                <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Ingested sequence · classification per tick
                </div>
                <div className="bg-slate-950 rounded-lg border border-slate-800 p-2.5 max-h-[132px] overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1">
                    {ticks.map((tick, i) => (
                      <div key={`${tick.label}-${i}`} className="flex items-baseline gap-1.5 font-mono text-[10px]">
                        <span className="text-slate-600 w-5 shrink-0">{tick.label}</span>
                        <span
                          className={
                            GENUINE_CLASSES.has(tick.packet.classification)
                              ? 'text-emerald-400'
                              : tick.packet.classification === 'NOMINAL_OPERATION'
                                ? 'text-slate-600'
                                : 'text-rose-400'
                          }
                        >
                          {tick.packet.classification}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cross-Check Results */}
            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                <span className="flex items-center gap-1">
                  <Satellite className="w-3.5 h-3.5 text-cyan-400" /> Live Spatial Cross-Check ({currentCase.stationId})
                </span>
                {!activeCheck && <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
              </div>

              {activeCheck ? (
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start gap-3 mb-1">
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${VERDICT_TONE[activeCheck.verdict]}`}>
                      Verdict: {activeCheck.verdict}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      <Radio className="w-3 h-3 inline mr-1" />
                      {activeCheck.source === 'OPEN_METEO' ? 'Open-Meteo' : 'no external source'}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">{activeCheck.rationale}</p>

                  {activeCheck.source !== 'NONE' && (
                    <div className="pt-2 border-t border-slate-800/50">
                      <div className="text-[10px] text-slate-500 mb-1.5">
                        {activeCheck.district.name}, {activeCheck.district.state} · {activeCheck.district.distanceKm} km from station
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                        <div>
                          <span className="text-slate-500 block mb-0.5">ΔTemp</span>
                          <span className={BAND_TONE[activeCheck.bands.temperature]}>
                            {activeCheck.deltas.temperature != null ? signed(activeCheck.deltas.temperature) + ' °C' : 'N/A'}
                          </span>
                          <span className="text-slate-600 block text-[9px]">band {activeCheck.bands.temperature}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-0.5">ΔPressure</span>
                          <span className={BAND_TONE[activeCheck.bands.pressure]}>
                            {activeCheck.deltas.pressure != null ? signed(activeCheck.deltas.pressure) + ' hPa' : 'N/A'}
                          </span>
                          <span className="text-slate-600 block text-[9px]">band {activeCheck.bands.pressure}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-0.5">ΔHumidity</span>
                          <span className={BAND_TONE[activeCheck.bands.humidity]}>
                            {activeCheck.deltas.humidity != null ? signed(activeCheck.deltas.humidity) + ' %' : 'N/A'}
                          </span>
                          <span className="text-slate-600 block text-[9px]">band {activeCheck.bands.humidity}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeCheckError ? (
                <div className="bg-slate-950 rounded-lg p-3 border border-rose-900/50 space-y-1.5">
                  <span className="font-mono text-xs font-bold text-rose-400">Verdict: INSUFFICIENT_DATA</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    The independent source could not be reached ({activeCheckError}). No substitute value is shown,
                    because a plausible-looking reading that was never observed is worse than no reading at all.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-950 rounded-lg p-6 border border-slate-800 text-center flex flex-col items-center justify-center min-h-[120px]">
                  <RefreshCw className="w-5 h-5 text-slate-600 animate-spin mb-2" />
                  <span className="text-[10px] text-slate-500 font-mono">Fetching Open-Meteo tiebreak…</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
