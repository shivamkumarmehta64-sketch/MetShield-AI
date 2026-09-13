'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Activity,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  ArrowRight,
  ExternalLink,
  Users,
  Award,
  Zap,
  Maximize2,
  Minimize2,
  BookOpen,
  Home,
  Globe,
  Radio,
  BarChart3,
  Server,
  CloudRain,
  Compass,
  Wrench,
  Flame,
  ArrowDownRight,
  Database,
  Code,
  FileText,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function PitchDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalSlides = 6;

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev < totalSlides - 1 ? prev + 1 : 0));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev > 0 ? prev - 1 : totalSlides - 1));
  }, [totalSlides]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key >= '1' && e.key <= '6') {
        setCurrentSlide(parseInt(e.key) - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* ─── Top Institutional Presentation Bar ─── */}
      <header className="border-b border-slate-800/90 bg-[#0b1329]/95 backdrop-blur px-4 py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-300 transition-colors px-2.5 py-1 rounded bg-slate-900 border border-slate-800"
          >
            <Home className="w-3.5 h-3.5 text-sky-400" />
            <span>Return to Live Portal</span>
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">METSHIELD AI</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-sky-300 border border-blue-500/30">
              SIH26073 Pitch Deck
            </span>
            <span className="hidden sm:inline-block text-xs text-slate-400">
              Team ID: <strong className="text-slate-200">73869 (AEROTECH)</strong>
            </span>
          </div>
        </div>

        {/* Slide Indicators & Navigation Controls */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            {[1, 2, 3, 4, 5, 6].map(idx => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx - 1)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  currentSlide === idx - 1
                    ? 'bg-sky-500 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Slide {idx}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevSlide}
              title="Previous Slide (←)"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 text-slate-300">
              {currentSlide + 1} / {totalSlides}
            </span>
            <button
              type="button"
              onClick={nextSlide}
              title="Next Slide (→)"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors ml-1"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Slide Canvas Container (16:9 Aspect Ratio Container) ─── */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-5 lg:p-6 max-w-[1550px] mx-auto w-full">
        <div className="w-full bg-[#0d162f]/90 border border-slate-700/80 rounded-2xl shadow-2xl p-5 sm:p-7 min-h-[620px] flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Institutional Watermark Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 font-bold tracking-wider text-sky-400 uppercase">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>SMART INDIA HACKATHON 2026 — INNOVATION PROTOTYPE DECK</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>PS: SIH26073</span>
              <span>•</span>
              <span>Team 73869 (AEROTECH)</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">PS Sponsor: MoES / IMD</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ──────────────────────────────────────────────────────────
                SLIDE 1: IDENTIFICATION & OVERVIEW (Mirrors PDF Slide 1)
               ────────────────────────────────────────────────────────── */}
            {currentSlide === 0 && (
              <motion.div
                key="slide-1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-between space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                    <span className="bg-gradient-to-r from-sky-400 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
                      METSHIELD AI
                    </span>
                    <span className="text-lg sm:text-xl font-mono text-sky-400 font-normal">
                      (NAWS-MetShield v4.2)
                    </span>
                  </h1>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    PS Sponsoring Organization: Ministry of Earth Sciences (MoES) / IMD
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1">
                  {/* Left Column: Metadata List */}
                  <div className="lg:col-span-6 space-y-3.5 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <strong className="text-sky-300 min-w-[170px]">• Problem Statement ID:</strong>
                        <span className="font-mono font-bold text-white">SIH26073</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <strong className="text-sky-300 min-w-[170px]">• Problem Statement:</strong>
                        <span className="text-slate-200 font-medium">
                          AI/ML-Based Intelligent Anomaly Detection for Automatic Weather Stations (AWS)
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <strong className="text-sky-300 min-w-[170px]">• Theme:</strong>
                        <span className="text-amber-300 font-semibold">Disaster Management</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <strong className="text-sky-300 min-w-[170px]">• PS Category:</strong>
                        <span className="text-slate-300">Software</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <strong className="text-sky-300 min-w-[170px]">• Team ID & Name:</strong>
                        <span className="text-emerald-300 font-bold font-mono">73869 — AEROTECH</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <strong className="text-white">Tagline: </strong>
                      Making National Weather Observatories Resilient Against Sensor Failures & Telemetry Corruption.
                    </div>
                  </div>

                  {/* Right Column: Stylized Gear/Brain & Radar Emblem */}
                  <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-sky-500/10 blur-xl animate-pulse" />
                      <div className="w-32 h-32 rounded-3xl border-2 border-sky-400/40 bg-gradient-to-br from-slate-900 via-sky-950/50 to-blue-900 flex items-center justify-center shadow-2xl">
                        <ShieldCheck className="w-16 h-16 text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      Meteorological Sensor Health, Intelligent Evaluation & Live Defense Engine
                    </h2>
                    <p className="text-xs text-slate-400 max-w-md">
                      Compliant with WMO-No. 8 Standards & NDMA Protocol 2026. Built for 24x7 continuous AWS telemetry assurance.
                    </p>
                  </div>
                </div>

                {/* Team Members & Roles Strip (6 Cards) */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>Team AEROTECH — Core Engineering Roles</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-left">
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="font-bold text-sky-300 text-xs">Lead Full-Stack</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">Architecture, 3-Tier QC & XAI</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="font-bold text-amber-300 text-xs">Satyam</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">2.5s Stream & Simulator</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="font-bold text-emerald-300 text-xs">Sundram</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">Edge AI & ESP32 Firmware</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="font-bold text-purple-300 text-xs">Khushi</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">WMO-No. 8 Bounds & QC</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="font-bold text-rose-300 text-xs">Priti</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">Test Scenarios & Audit</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="font-bold text-cyan-300 text-xs">Documentation Lead</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">GIGW & SPOC Hygiene</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────────────────────────────────────────────────────
                SLIDE 2: PROPOSED SOLUTION / APPROACH (Mirrors PDF Slide 2)
               ────────────────────────────────────────────────────────── */}
            {currentSlide === 1 && (
              <motion.div
                key="slide-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="text-xs uppercase font-bold text-sky-400">Proposed Solution / Approach</div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Autonomous Telemetry Shielding for India&apos;s Surface Weather Grid
                  </h2>
                </div>

                {/* Main Split Grid mirroring PDF Page 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
                  {/* Left Side: 5 Bullet Points */}
                  <div className="lg:col-span-6 space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs flex flex-col justify-between">
                    <div>
                      <strong className="text-amber-400 text-[13px]">• Tri-Parameter Stream Guardian:</strong>
                      <p className="text-slate-300 mt-0.5 leading-snug">
                        Evaluates high-frequency telemetry strictly across Temp (-10°C to 55°C), Pressure (920 to 1050 hPa), and Humidity (5% to 100%).
                      </p>
                    </div>

                    <div>
                      <strong className="text-sky-400 text-[13px]">• Thermodynamic Convective Discriminator:</strong>
                      <p className="text-slate-300 mt-0.5 leading-snug">
                        Prevents false alarms by distinguishing physical sensor failures (isolated thermal jumps) from genuine severe cyclogenesis (ΔP ≤ -2.5 hPa coupled with ΔRH ≥ +15%).
                      </p>
                    </div>

                    <div>
                      <strong className="text-emerald-400 text-[13px]">• Explainable AI (XAI) Attribution Engine:</strong>
                      <p className="text-slate-300 mt-0.5 leading-snug">
                        Computes real-time parameter-level contribution percentages (Temp %, Pres %, Hum %) using rolling Z-score feature attributions paired with natural language operator reasoning.
                      </p>
                    </div>

                    <div>
                      <strong className="text-purple-400 text-[13px]">• Self-Healing Moving-Average Imputer:</strong>
                      <p className="text-slate-300 mt-0.5 leading-snug">
                        Synthesizes continuous substitute values for quarantined readings to prevent voids in downstream Numerical Weather Prediction (NWP) models.
                      </p>
                    </div>

                    <div>
                      <strong className="text-cyan-400 text-[13px]">• Physical Hardware Bridge:</strong>
                      <p className="text-slate-300 mt-0.5 leading-snug">
                        Connects to mobile barometers via Web Generic Sensor API (window.PressureSensor) and interfaces with low-power ESP32 microcontrollers.
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Flowchart Box (Top) & Innovation Arched Cards (Bottom) */}
                  <div className="lg:col-span-6 flex flex-col justify-between gap-3">
                    {/* Flowchart Diagram mirroring PDF */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex-1">
                      <div className="text-[11px] font-bold uppercase text-slate-400 mb-2 flex items-center justify-between">
                        <span>METSHIELD AI End-to-end workflow</span>
                        <span className="font-mono text-emerald-400 text-[10px]">Sub-50ms Inference</span>
                      </div>
                      <div className="font-mono text-[10px] text-sky-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 leading-snug overflow-x-auto">
                        <div className="text-emerald-400">[Start] ──► [2.5s DCP/GPRS Stream Ingestion]</div>
                        <div className="text-slate-400 pl-4">│</div>
                        <div className="text-sky-300 pl-2">▼ [Tier 1: WMO Physical Limit Screening]</div>
                        <div className="text-slate-400 pl-4">│</div>
                        <div className="text-amber-300 pl-2">▼ [Tier 2: Probe Freeze (σ &lt; 0.001) &amp; RoC Check]</div>
                        <div className="text-slate-400 pl-4">│</div>
                        <div className="text-purple-300 pl-2">▼ [Tier 3: Thermodynamic Convective Discriminator]</div>
                        <div className="text-slate-300 pl-4">├─► Anomalous?</div>
                        <div className="text-emerald-300 pl-8">├─► [NO] ──► Pass: HEALTHY / BLUE STORM ──► Feed to NWP</div>
                        <div className="text-rose-400 pl-8">└─► [YES] ─► RED ALERT ─► SHAP Weights ─► Moving Avg Impute ─► Dispatch Ticket</div>
                      </div>
                    </div>

                    {/* Innovation & Uniqueness (5 Arched Cards like PDF) */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold uppercase text-slate-400">Innovation and Uniqueness</div>
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        <div className="p-2 rounded-xl bg-gradient-to-b from-sky-950/40 to-slate-900 border border-sky-500/30 flex flex-col justify-between">
                          <Zap className="w-3.5 h-3.5 text-sky-400 mx-auto mb-1" />
                          <div className="text-[10px] font-bold text-sky-300 leading-tight">Thermodynamic Coupling</div>
                        </div>
                        <div className="p-2 rounded-xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col justify-between">
                          <Cpu className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                          <div className="text-[10px] font-bold text-emerald-300 leading-tight">Sub-50ms Edge Engine</div>
                        </div>
                        <div className="p-2 rounded-xl bg-gradient-to-b from-purple-950/40 to-slate-900 border border-purple-500/30 flex flex-col justify-between">
                          <RefreshCw className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
                          <div className="text-[10px] font-bold text-purple-300 leading-tight">Self-Healing Imputation</div>
                        </div>
                        <div className="p-2 rounded-xl bg-gradient-to-b from-amber-950/40 to-slate-900 border border-amber-500/30 flex flex-col justify-between">
                          <Activity className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                          <div className="text-[10px] font-bold text-amber-300 leading-tight">Explainable XAI Bars</div>
                        </div>
                        <div className="p-2 rounded-xl bg-gradient-to-b from-cyan-950/40 to-slate-900 border border-cyan-500/30 flex flex-col justify-between">
                          <Globe className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
                          <div className="text-[10px] font-bold text-cyan-300 leading-tight">GIGW NIC Interface</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────────────────────────────────────────────────────
                SLIDE 3: TECHNICAL APPROACH & ARCHITECTURE (Mirrors PDF Slide 3)
               ────────────────────────────────────────────────────────── */}
            {currentSlide === 2 && (
              <motion.div
                key="slide-3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="text-xs uppercase font-bold text-sky-400">TECHNICAL APPROACH</div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Decoupled Edge-Resilient Telemetry Pipeline & Multi-Tier QC Engine
                  </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
                  {/* Left 4-Zone Architecture Table */}
                  <div className="lg:col-span-7 bg-[#0b1329] border border-slate-800 rounded-xl overflow-x-auto flex flex-col justify-between">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">Zone</th>
                          <th className="py-2 px-2.5">Layer Name</th>
                          <th className="py-2 px-3">Technology Stack</th>
                          <th className="py-2 px-3">Core Functional Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 text-[11px]">
                        <tr className="hover:bg-slate-900/30">
                          <td className="py-2 px-2.5 font-mono font-bold text-sky-400">Zone 1</td>
                          <td className="py-2 px-2.5 font-semibold text-white">Telemetry &amp; Sensors</td>
                          <td className="py-2 px-3 font-mono text-slate-300">INSAT-3D DCP, GPRS, ESP32, Web Sensors API</td>
                          <td className="py-2 px-3 text-slate-400">Ingests 2.5s raw packets, phone barometers, IMD/NOAA baseline records.</td>
                        </tr>
                        <tr className="hover:bg-slate-900/30">
                          <td className="py-2 px-2.5 font-mono font-bold text-emerald-400">Zone 2</td>
                          <td className="py-2 px-2.5 font-semibold text-white">Presentation Layer</td>
                          <td className="py-2 px-3 font-mono text-slate-300">Next.js App Router, Tailwind, Recharts, Lucide</td>
                          <td className="py-2 px-3 text-slate-400">Civic 65/35 split view, synchronized curves, XAI attribution bars.</td>
                        </tr>
                        <tr className="hover:bg-slate-900/30">
                          <td className="py-2 px-2.5 font-mono font-bold text-amber-400">Zone 3</td>
                          <td className="py-2 px-2.5 font-semibold text-white">Gateway &amp; Telemetry</td>
                          <td className="py-2 px-3 font-mono text-slate-300">Edge Serverless, SSE Stream, CSV Generator</td>
                          <td className="py-2 px-3 text-slate-400">Sub-10ms packet intake, sliding ring-buffer (prev.slice(-29)), audit export.</td>
                        </tr>
                        <tr className="hover:bg-slate-900/30">
                          <td className="py-2 px-2.5 font-mono font-bold text-purple-400">Zone 4</td>
                          <td className="py-2 px-2.5 font-semibold text-white">Data &amp; Intelligence (&ldquo;Brain&rdquo;)</td>
                          <td className="py-2 px-3 font-mono text-slate-300">TypeScript / Python Engine, Z-Score/SHAP XAI</td>
                          <td className="py-2 px-3 text-slate-400">3-Tier QC pipeline enforcing WMO limits, freeze checks, thermodynamic storm filter.</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Bottom Tech Logos Strip */}
                    <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Components / Tech Stack:</span>
                      <div className="flex items-center gap-2 font-mono text-sky-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800">Next.js 16</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800">React 19</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800">Tailwind</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800">Recharts</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800">Python/TS</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800">ESP32</span>
                      </div>
                    </div>
                  </div>

                  {/* Right 6-Step Implementation Process mirroring PDF Page 3 */}
                  <div className="lg:col-span-5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div className="text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Implementation Process (6 Steps)
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                        <div><strong className="text-white">Field Ingestion:</strong> <span className="text-slate-400">2.5s DCP stream captures Temp, Pressure, Humidity.</span></div>
                      </div>
                      <div className="flex items-start gap-2.5 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                        <div><strong className="text-white">WMO Screening:</strong> <span className="text-slate-400">Tier 1 physical boundary limits (-10 to 55°C, 920-1050 hPa).</span></div>
                      </div>
                      <div className="flex items-start gap-2.5 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                        <div><strong className="text-white">Persistence &amp; RoC:</strong> <span className="text-slate-400">Tier 2 probe freeze (σ &lt; 0.001) &amp; rate-of-change jump detection.</span></div>
                      </div>
                      <div className="flex items-start gap-2.5 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                        <div><strong className="text-white">Thermodynamic Check:</strong> <span className="text-slate-400">Tier 3 coupling (ΔP drop + ΔRH surge) discriminates storms.</span></div>
                      </div>
                      <div className="flex items-start gap-2.5 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">5</span>
                        <div><strong className="text-white">XAI &amp; Imputation:</strong> <span className="text-slate-400">SHAP attribution weights + moving-average void healing.</span></div>
                      </div>
                      <div className="flex items-start gap-2.5 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">6</span>
                        <div><strong className="text-white">Maintenance Dispatch:</strong> <span className="text-slate-400">Auto work orders dispatched &amp; clean data fed to NWP.</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────────────────────────────────────────────────────
                SLIDE 4: FEASIBILITY AND VIABILITY (Mirrors PDF Slide 4)
               ────────────────────────────────────────────────────────── */}
            {currentSlide === 3 && (
              <motion.div
                key="slide-4"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="text-xs uppercase font-bold text-sky-400">FEASIBILITY AND VIABILITY</div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Production Readiness, Rubric Alignment &amp; Risk Mitigation
                  </h2>
                </div>

                {/* Top 3 Cards (Feasibility, Viability, Practical Implementation) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-xs font-bold text-emerald-400 uppercase mb-1">Feasibility</div>
                    <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                      <li>Uses proven physical equations &amp; deterministic algorithms for anomaly detection.</li>
                      <li>Runs sub-50ms inference on browser or edge ESP32 microcontrollers.</li>
                      <li>Zero paid cloud API dependencies; runs cost-free on edge.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-xs font-bold text-sky-400 uppercase mb-1">Viability</div>
                    <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                      <li>Directly addresses the SIH26073 problem statement for automated quality management.</li>
                      <li>Preserves NWP feed integrity by eliminating data corruption voids.</li>
                      <li>Reduces routine manual station inspection trips by ~95%.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-xs font-bold text-amber-400 uppercase mb-1">Practical Implementation</div>
                    <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                      <li>Ready for pilot rollout across IMD observatories within 3 to 6 months.</li>
                      <li>Works offline for remote rural stations via edge ring-buffers.</li>
                      <li>Bilingual GIGW/NIC standard UI for effortless operator adoption.</li>
                    </ul>
                  </div>
                </div>

                {/* Bottom S-Curve Flow mirroring PDF Page 4 (5 Risks ──► 5 Strategies) */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400">
                    <span className="text-rose-400">Potential Challenges and Risks (01 to 05)</span>
                    <span className="text-emerald-400">Strategies For Overcoming Challenges (01 to 05)</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {[
                      {
                        num: '01',
                        risk: 'Intermittent Rural Connectivity: Telemetry dropouts in remote areas.',
                        strat: 'Dual-mode edge buffer (DCP satellite + cellular GPRS) with packet-loss detection.',
                      },
                      {
                        num: '02',
                        risk: 'False Alarms During Extreme Storms: Cyclones flagged as broken sensors.',
                        strat: 'Coupled thermodynamic validation (ΔP drop + ΔRH surge) marks storms in Blue.',
                      },
                      {
                        num: '03',
                        risk: 'Data Gaps in Forecasting Models: Quarantined readings cause numerical voids.',
                        strat: 'Automated moving-average data imputation synthesizes realistic substitute values.',
                      },
                      {
                        num: '04',
                        risk: 'Sensor Hardware Degradation: Harsh weather causes progressive calibration drift.',
                        strat: 'Rolling baseline regression tracks slow drift and triggers predictive maintenance.',
                      },
                      {
                        num: '05',
                        risk: 'Observatory Workflow Integration: Reluctance to adopt unfamiliar UI systems.',
                        strat: 'Accessible bilingual UI with automated CSV audit logs conforming to standard IMD data structures.',
                      },
                    ].map(item => (
                      <div
                        key={item.num}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 rounded bg-slate-900/80 border border-slate-800"
                      >
                        <div className="md:col-span-5 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center font-bold text-[10px] font-mono shrink-0">
                            {item.num}
                          </span>
                          <span className="text-slate-300 text-[11px]">{item.risk}</span>
                        </div>

                        <div className="hidden md:flex md:col-span-2 items-center justify-center text-slate-500">
                          <ArrowRight className="w-4 h-4 text-sky-400 animate-pulse" />
                        </div>

                        <div className="md:col-span-5 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-[10px] font-mono shrink-0">
                            {item.num}
                          </span>
                          <span className="text-emerald-200 text-[11px]">{item.strat}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────────────────────────────────────────────────────────
                SLIDE 5: IMPACT AND BENEFITS (Mirrors PDF Slide 5)
               ────────────────────────────────────────────────────────── */}
            {currentSlide === 4 && (
              <motion.div
                key="slide-5"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="text-xs uppercase font-bold text-sky-400">IMPACT AND BENEFITS</div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Quantifiable Value for National Weather Monitoring &amp; Public Safety
                  </h2>
                </div>

                {/* Left (Targeted Audience Concentric Ring) & Right (Benefits Quotes) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
                  {/* Left Side: 5 Stakeholder Nodes */}
                  <div className="lg:col-span-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div className="text-xs font-bold uppercase text-slate-400 mb-2">
                      Potential Impact on Targeted Audience
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                        <strong className="text-sky-300">Observatory Operators &amp; Field Crews:</strong>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Root-cause diagnostic tickets with specific probe attribution eliminate manual inspection trips.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                        <strong className="text-emerald-300">IMD &amp; NWP Forecasting Centers:</strong>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Clean, continuously imputed data feeds prevent numerical model divergence in cyclogenesis.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                        <strong className="text-amber-300">Disaster Management Authorities (NDRF/SDMAs):</strong>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Reliable early warnings without false-alarm blinding ensure timely evacuation orders.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                        <strong className="text-purple-300">Community &amp; Local Farming:</strong>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Protects agricultural advisories, sowing calendars, and local agrarian resilience.
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                        <strong className="text-cyan-300">The Nation:</strong>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Safeguards aviation, maritime operations, and infrastructure from unpredicted extreme weather.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: 3 Speech-Bubble Quote Cards mirroring PDF Page 5 */}
                  <div className="lg:col-span-6 flex flex-col justify-between gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase">
                        <Users className="w-4 h-4" />
                        <span>Social Benefits</span>
                      </div>
                      <p className="text-slate-300 text-xs italic leading-snug">
                        &ldquo;Builds institutional trust with transparent XAI anomaly tracking and explains every flagged reading with natural language operator rationale.&rdquo;
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                        <Activity className="w-4 h-4" />
                        <span>Economic Benefits</span>
                      </div>
                      <p className="text-slate-300 text-xs italic leading-snug">
                        &ldquo;Automates ~95% of manual quality-control auditing across 1,300+ stations and operates with ₹0 cloud infrastructure cost using edge computing.&rdquo;
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Environmental &amp; Safety</span>
                      </div>
                      <p className="text-slate-300 text-xs italic leading-snug">
                        &ldquo;Protects lives and critical infrastructure through accurate severe squall and cloudburst detection with zero data voids.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Quote Banner mirroring PDF Page 5 */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/40 via-sky-950/30 to-slate-900 border border-sky-500/30 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-sky-200 italic">
                    &ldquo;India&apos;s first real-time, thermodynamic-aware telemetry quality shield for surface weather observatories—safeguarding national forecasts from probe to citizen.&rdquo;
                  </p>
                </div>
              </motion.div>
            )}

            {/* ──────────────────────────────────────────────────────────
                SLIDE 6: RESEARCH AND REFERENCES (Mirrors PDF Slide 6)
               ────────────────────────────────────────────────────────── */}
            {currentSlide === 5 && (
              <motion.div
                key="slide-6"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="text-xs uppercase font-bold text-sky-400">RESEARCH AND REFERENCES</div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Standards Compliance, Academic Foundations &amp; Live Verification
                  </h2>
                </div>

                {/* Top Box: Field & Applied Research */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold uppercase text-sky-400 flex items-center gap-1.5">
                    <Compass className="w-4 h-4" />
                    <span>Field &amp; Applied Research</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Evaluated against real surface observation profiles from IMD AWS stations (Safdarjung AWS-DEL-04, Colaba AWS-MUM-01) across diverse seasonal cycles.</li>
                    <li>Verified against synthetic fault injection datasets modeling thermistor open-circuits, hygrometer probe freezes, and barometric calibration drifts.</li>
                  </ul>
                </div>

                {/* Middle Box: Academic & Government Sources */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>Academic &amp; Standards Sources</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                    <li>• <strong>World Meteorological Organization (WMO-No. 8):</strong> <em>Guide to Instruments and Methods of Observation</em>, operational range and step-change criteria for surface telemetry.</li>
                    <li>• <strong>Standards Reference (MoES / IMD Specifications):</strong> Published Automated Weather Station Quality Control Guidelines and Technical Specifications for Surface Observatories.</li>
                    <li>• <strong>Accessibility Reference:</strong> Digital Accessibility &amp; Bilingual Usability Guidelines for Civic Public Portals.</li>
                    <li>• <strong>Explainable AI in Meteorological Telemetry:</strong> Multi-parameter sensor attribution frameworks using rolling Z-score and SHAP methodology.</li>
                  </ul>
                </div>

                {/* Bottom Box: Live Deliverables & Verification Links */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>Live Deliverables &amp; Verification Links</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <Link
                      href="/"
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/40 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-sky-300">Live Operational Portal</div>
                        <div className="text-[10px] text-slate-400">aws2026-nu.vercel.app</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    </Link>

                    <a
                      href="https://youtu.be/ZyIHjiJ7GRI"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-amber-300">Prototype Video Demo</div>
                        <div className="text-[10px] text-slate-400">youtu.be/ZyIHjiJ7GRI</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    </a>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-emerald-300">Source Code Repository</div>
                        <div className="text-[10px] text-slate-400">SIH26073 Production Build</div>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ─── Bottom Navigation Strip ─── */}
      <footer className="border-t border-slate-800/80 bg-[#080e22] px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Use keyboard</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">→</kbd>
          <span>or keys 1-6 to navigate slides</span>
        </div>

        <Link
          href="/"
          className="hover:text-sky-400 transition-colors flex items-center gap-1 font-medium text-xs"
        >
          <span>Return to Live Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </footer>
    </div>
  );
}
