'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ShieldCheck, Cpu, ArrowRight, Zap, CheckCircle2,
  XCircle, Brain, RefreshCw, BarChart2, Activity, Thermometer, Gauge, Droplets, Sparkles
} from 'lucide-react';

interface TestCase {
  id: 'spike' | 'stuck' | 'drift' | 'storm';
  label: string;
  shortDesc: string;
  icon: string;
  badgeColor: string;
  input: {
    temp: number;
    tempChange: string;
    pressure: number;
    pressureChange: string;
    humidity: number;
    humidityChange: string;
  };
  classification: 'QUARANTINED_FAULT' | 'APPROVED_GENUINE';
  faultType: string;
  confidence: number;
  shapWeights: {
    tempRoC: number;
    pressureCoupling: number;
    humidityCoupling: number;
    temporalPattern: number;
  };
  reasoning: string;
  observed: string;
  imputed: string;
  rulImpact: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'spike',
    label: '🚨 Sensor Spike',
    shortDesc: 'Broken wire / ADC surge (+24.6°C jump in 5s)',
    icon: '⚡',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    input: {
      temp: 55.8,
      tempChange: '+24.6°C / 5s ⚠️',
      pressure: 1012.4,
      pressureChange: '0.0 hPa (Nominal)',
      humidity: 62.0,
      humidityChange: '0.0% (Nominal)',
    },
    classification: 'QUARANTINED_FAULT',
    faultType: 'Hardware Sensor Spike (WMO Flag 4)',
    confidence: 97.4,
    shapWeights: {
      tempRoC: 62,
      pressureCoupling: 18,
      humidityCoupling: 12,
      temporalPattern: 8,
    },
    reasoning: 'Temperature increased by 24.6°C within 5 seconds without corresponding atmospheric pressure drop or moisture coupling. Physical thermodynamics forbids instantaneous +24.6°C air mass heating without pressure disturbance.',
    observed: 'Temp: 55.8°C ❌',
    imputed: 'Temp: 31.2°C ✅ (Spatial Imputation)',
    rulImpact: 'Thermistor Resistance Anomaly · Inspect Wiring',
  },
  {
    id: 'stuck',
    label: '🥶 Stuck ADC',
    shortDesc: 'Frozen sensor register (0.00°C variance for 15 min)',
    icon: '❄️',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    input: {
      temp: 28.5,
      tempChange: '0.00°C (Stuck)',
      pressure: 1008.2,
      pressureChange: '0.00 hPa (Stuck)',
      humidity: 74.0,
      humidityChange: '0.00% (Stuck)',
    },
    classification: 'QUARANTINED_FAULT',
    faultType: 'ADC Bus Freeze / Frozen Sensor (WMO Flag 4)',
    confidence: 99.1,
    shapWeights: {
      tempRoC: 15,
      pressureCoupling: 35,
      humidityCoupling: 25,
      temporalPattern: 25,
    },
    reasoning: 'Telemetry shows exact 0.0000 variance across all 3 parameters over 12 consecutive transmission frames. Natural atmospheric micro-turbulence guarantees minor noise floor fluctuations; zero variance indicates stuck ADC register.',
    observed: 'Variance: 0.00 ❌',
    imputed: 'Imputed via Neighbor AWS-DEL-02 ✅',
    rulImpact: 'I2C Bus Reset Initiated · Auto-Recovery Active',
  },
  {
    id: 'drift',
    label: '📈 Sensor Drift',
    shortDesc: 'Monotonic pressure bias (-0.9 hPa/hr calibration loss)',
    icon: '📉',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    input: {
      temp: 32.1,
      tempChange: '+0.2°C / hr',
      pressure: 994.1,
      pressureChange: '-0.9 hPa / hr 📉',
      humidity: 58.0,
      humidityChange: '-1.0% / hr',
    },
    classification: 'QUARANTINED_FAULT',
    faultType: 'Barometric Sensor Drift (WMO Flag 3)',
    confidence: 94.2,
    shapWeights: {
      tempRoC: 10,
      pressureCoupling: 52,
      humidityCoupling: 18,
      temporalPattern: 20,
    },
    reasoning: 'Baro sensor exhibits steady monotonic negative pressure bias over 6 hours while 4 adjacent regional stations report steady 1010.5 hPa. Haversine spatial cross-validation isolated local sensor calibration drift.',
    observed: 'Pressure: 994.1 hPa ❌',
    imputed: 'Corrected: 1010.3 hPa ✅ (Kriging Mesh)',
    rulImpact: 'Sensor Degradation Warning · Recalibrate within 14 days',
  },
  {
    id: 'storm',
    label: '⛈️ Severe Storm',
    shortDesc: 'Genuine convective squall (Pressure drop + RH surge)',
    icon: '🌪️',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    input: {
      temp: 24.2,
      tempChange: '-4.8°C / 10m (Rain-Cooled)',
      pressure: 998.4,
      pressureChange: '-2.8 hPa / 10m 🔻',
      humidity: 94.0,
      humidityChange: '+22% (Squall Inflow)',
    },
    classification: 'APPROVED_GENUINE',
    faultType: 'Verified Convective Storm Front (WMO Flag 2)',
    confidence: 98.6,
    shapWeights: {
      tempRoC: 28,
      pressureCoupling: 32,
      humidityCoupling: 25,
      temporalPattern: 15,
    },
    reasoning: 'Pressure drop of -2.8 hPa is strongly coupled with temperature drop (-4.8°C) and humidity spike (+22%), matching atmospheric parcel equations during a severe convective thunderstorm passage. Fully validated for NWP assimilation.',
    observed: 'Multi-Parameter Storm Coupling ✅',
    imputed: 'Data Validated · Passed to NWP Models',
    rulImpact: 'Sensors Nominal · Convective Alert Broadcasted',
  },
];

export function StormVsFaultSimulator() {
  const [selectedId, setSelectedId] = useState<'spike' | 'stuck' | 'drift' | 'storm'>('spike');
  const currentCase = TEST_CASES.find(c => c.id === selectedId) || TEST_CASES[0];

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
            Click any test scenario to evaluate Metshield AI&apos;s real-time physical discriminator in &lt;5ms
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-right font-mono text-[11px]">
          <span className="text-slate-400 block text-[9px] uppercase font-bold">Discriminator Latency</span>
          <span className="text-cyan-400 font-bold">3.8ms (Sub-Frame)</span>
        </div>
      </div>

      {/* 4 Interactive Test Scenario Selector Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
        {TEST_CASES.map(tc => {
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
                <span className="text-base">{tc.icon}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${tc.badgeColor}`}>
                  {tc.id === 'storm' ? 'GENUINE' : 'FAULT'}
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
          {/* Left Column: Simulated Inputs & Classification */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Raw Telemetry Stream Input
              </span>
              <span className="text-[10px] font-mono text-slate-500">T + P + RH</span>
            </div>

            {/* Input Parameter Cards */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-1">
                  <Thermometer className="w-3 h-3 text-rose-400" /> Temp
                </div>
                <div className="font-bold text-white text-sm">{currentCase.input.temp}°C</div>
                <div className="text-[9px] text-amber-400 mt-0.5 leading-tight">{currentCase.input.tempChange}</div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-1">
                  <Gauge className="w-3 h-3 text-sky-400" /> Pressure
                </div>
                <div className="font-bold text-white text-sm">{currentCase.input.pressure}hPa</div>
                <div className="text-[9px] text-cyan-400 mt-0.5 leading-tight">{currentCase.input.pressureChange}</div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-1">
                  <Droplets className="w-3 h-3 text-blue-400" /> Humidity
                </div>
                <div className="font-bold text-white text-sm">{currentCase.input.humidity}%</div>
                <div className="text-[9px] text-purple-400 mt-0.5 leading-tight">{currentCase.input.humidityChange}</div>
              </div>
            </div>

            {/* Classification Outcome Card */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              currentCase.classification === 'APPROVED_GENUINE'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${
                  currentCase.classification === 'APPROVED_GENUINE'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                    : 'bg-rose-500/20 border-rose-400 text-rose-400'
                }`}>
                  {currentCase.classification === 'APPROVED_GENUINE' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Metshield AI Decision</div>
                  <div className="font-black text-sm text-white">
                    {currentCase.classification === 'APPROVED_GENUINE' ? 'APPROVED FOR NWP' : 'QUARANTINED (FAULT)'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-300">{currentCase.faultType}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold text-white">{currentCase.confidence}%</div>
                <div className="text-[9px] text-slate-400">AI Confidence</div>
              </div>
            </div>
          </div>

          {/* Right Column: XAI Reasoning, SHAP Attribution & Imputation */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between">
            {/* AI Natural Language Reasoning */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 mb-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span>Explainable AI (XAI) Diagnostic Reasoning:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-sans">
                &ldquo;{currentCase.reasoning}&rdquo;
              </p>
            </div>

            {/* SHAP Feature Contribution Breakdown Bars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5 text-cyan-400" /> SHAP Feature Blame Weight Attribution
                </span>
                <span className="font-mono text-[10px]">Total = 100%</span>
              </div>

              <div className="space-y-1.5 font-mono text-[10px]">
                <div>
                  <div className="flex justify-between text-slate-300 mb-0.5">
                    <span>Temp Rate-of-Change (RoC)</span>
                    <span className="text-cyan-400 font-bold">{currentCase.shapWeights.tempRoC}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentCase.shapWeights.tempRoC}%` }}
                      transition={{ duration: 0.4 }}
                      className="h-full bg-cyan-400 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-0.5">
                    <span>Pressure Coupling Dynamics</span>
                    <span className="text-sky-400 font-bold">{currentCase.shapWeights.pressureCoupling}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentCase.shapWeights.pressureCoupling}%` }}
                      transition={{ duration: 0.4, delay: 0.05 }}
                      className="h-full bg-sky-400 rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-0.5">
                    <span>Humidity Coupling Ratio</span>
                    <span className="text-purple-400 font-bold">{currentCase.shapWeights.humidityCoupling}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentCase.shapWeights.humidityCoupling}%` }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="h-full bg-purple-400 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Imputation & Maintenance Output Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">Imputation Action</span>
                <div className="font-mono text-cyan-300 font-bold">{currentCase.imputed}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Observed: {currentCase.observed}</div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">RUL / Maintenance Protocol</span>
                <div className="font-mono text-emerald-400 font-bold">{currentCase.rulImpact}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Auto Dispatched to Field Node</div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
