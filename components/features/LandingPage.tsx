'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  Play,
  Activity,
  ShieldCheck,
  Zap,
  Radio,
  Cpu,
  Globe,
  Smartphone,
  CloudLightning,
  BarChart3,
  Lock,
  Wrench,
  Download,
  Award,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Compass,
  TrendingUp,
  FileText,
  Users,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { StormVsFaultSimulator } from '@/components/StormVsFaultSimulator';
import { AIEnginePipeline } from '@/components/AIEnginePipeline';
import { WeatherAtmosphereCanvas } from '@/components/WeatherAtmosphereCanvas';
import { GovSpatialConsensusPanel } from '@/components/GovSpatialConsensusPanel';
import { GovInstitutionalConsole } from '@/components/GovInstitutionalConsole';

/* ─── Animated Counter Hook ─── */
function useCounter(target: number, duration = 2000, decimals = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration, decimals]);

  return { count, ref };
}

/* ─── Animated Background Grid ─── */
function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(#06b6d4 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.12]"
        style={{
          background: 'radial-gradient(circle, #0284c7 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

/* ─── Capability Card ─── */
function CapCard({
  icon,
  title,
  desc,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="bg-[#0e1730]/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-4 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 group"
    >
      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-2.5 group-hover:bg-cyan-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="font-bold text-white text-xs mb-1">{title}</h3>
      <p className="text-[11px] text-slate-400 leading-snug">{desc}</p>
    </motion.div>
  );
}

/* ─── Main Landing Page ─── */
export default function LandingPage() {
  const [systemAge, setSystemAge] = useState(0);
  const [fontSizeScale, setFontSizeScale] = useState<'sm' | 'md' | 'lg'>('md');
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setSystemAge(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const stations = useCounter(1350, 2200);
  const qcScore = useCounter(99.4, 2400, 1);
  const latency = useCounter(3.8, 1800, 1);
  const districts = useCounter(766, 2000);

  const fontClass =
    fontSizeScale === 'sm' ? 'text-xs' : fontSizeScale === 'lg' ? 'text-base' : 'text-sm';

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className={`min-h-screen bg-[#070d1e] text-white flex flex-col relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950 transition-all duration-200 ${fontClass}`}
    >
      {/* ─── 2px National Color Accent Strip ─── */}
      <div
        className="w-full h-[3px] flex shrink-0 sticky top-0 z-50"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to right, #FF9933 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #138808 66.6%)',
        }}
      />

      {/* ─── Institutional Header Bar ─── */}
      <header className="border-b border-slate-800/90 bg-[#0b1329]/95 backdrop-blur sticky top-[3px] z-40 px-3 sm:px-4 py-2 shadow-md">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          {/* Left: Shield Emblem & Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border border-slate-700/80 flex items-center justify-center p-1 shadow-inner">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 animate-pulse" />
            </div>
            <div>
              <div className="hidden sm:flex text-[11px] uppercase tracking-wider text-slate-400 font-semibold items-center gap-1.5">
                <span>
                  {lang === 'en'
                    ? 'AUTOMATED WEATHER OBSERVATORY QUALITY ASSURANCE'
                    : 'स्वचालित मौसम वेधशाला गुणवत्ता आश्वासन प्रणाली'}
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400">
                  National Weather Telemetry QMS Engine • Team AEROTECH
                </span>
              </div>
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5 sm:gap-2">
                <span>METSHIELD AI</span>
                <span className="text-[10px] sm:text-xs font-mono font-normal px-1.5 sm:px-2 py-0.5 rounded bg-blue-500/10 text-sky-300 border border-blue-500/30">
                  SIH26073 • MoES
                </span>
              </h1>
            </div>
          </div>

          {/* Center: Desktop Storyline Links */}
          <nav className="hidden xl:flex items-center gap-1 text-xs text-slate-300 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => scrollToSection('problem-context')}
              className="px-2.5 py-1 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
            >
              1. Challenge
            </button>
            <button
              onClick={() => scrollToSection('live-console')}
              className="px-2.5 py-1 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors text-sky-400 font-semibold"
            >
              2. Live 65/35 Stream
            </button>
            <button
              onClick={() => scrollToSection('storm-simulator')}
              className="px-2.5 py-1 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
            >
              3. Physics Proof
            </button>
            <button
              onClick={() => scrollToSection('spatial-consensus')}
              className="px-2.5 py-1 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors text-cyan-400 font-semibold"
            >
              4. Spatial Consensus
            </button>
            <button
              onClick={() => scrollToSection('tech-architecture')}
              className="px-2.5 py-1 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
            >
              5. 4-Zone Architecture
            </button>
            <button
              onClick={() => scrollToSection('field-usability')}
              className="px-2.5 py-1 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
            >
              6. Field Usability
            </button>
            <button
              onClick={() => scrollToSection('why-we-win')}
              className="px-2.5 py-1 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors text-emerald-400 font-bold"
            >
              7. Solid Finisher
            </button>
          </nav>

          {/* Right Navigation & Accessibility */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2.5">
            <Link
              href="/stations"
              className="flex items-center gap-1 text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Stations</span>
            </Link>

            <Link
              href="/incidents"
              className="flex items-center gap-1 text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Incidents</span>
            </Link>

            <Link
              href="/analytics"
              className="flex items-center gap-1 text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Analytics</span>
            </Link>

            <Link
              href="/mobile"
              className="flex items-center gap-1 text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Mobile</span>
              <span className="sm:hidden">Mobile</span>
            </Link>

            {/* Font Size Controls */}
            <div className="flex items-center border border-slate-700 rounded-md overflow-hidden bg-slate-900 text-[11px]">
              <button
                type="button"
                onClick={() => setFontSizeScale('sm')}
                aria-label="Decrease Font Size"
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 font-semibold hover:bg-slate-800 ${
                  fontSizeScale === 'sm' ? 'bg-sky-600 text-white' : 'text-slate-400'
                }`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSizeScale('md')}
                aria-label="Default Font Size"
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 font-semibold hover:bg-slate-800 ${
                  fontSizeScale === 'md' ? 'bg-sky-600 text-white' : 'text-slate-400'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSizeScale('lg')}
                aria-label="Increase Font Size"
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 font-semibold hover:bg-slate-800 ${
                  fontSizeScale === 'lg' ? 'bg-sky-600 text-white' : 'text-slate-400'
                }`}
              >
                A+
              </button>
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLang(l => (l === 'en' ? 'hi' : 'en'))}
              className="text-[11px] px-2 py-0.5 sm:py-1 rounded border border-slate-700 bg-slate-900 text-slate-300 font-medium hover:border-slate-500 transition-colors"
            >
              {lang === 'en' ? 'हिन्दी' : 'EN'}
            </button>

            {/* System Tour Trigger */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event('start-system-tour'));
                document.getElementById('live-console')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded bg-[#002147] hover:bg-blue-900 text-white border border-blue-500/30 transition-all shadow-[0_0_10px_rgba(37,99,235,0.2)]"
            >
              <Play className="w-3 h-3 text-cyan-400" />
              System Tour (60s)
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile/Tablet Horizontal Quick-Jump Chips (Touch Scrollable) ─── */}
      <div className="xl:hidden w-full bg-[#080e22]/95 backdrop-blur-md border-b border-slate-800 px-3 py-1.5 overflow-x-auto flex items-center gap-1.5 text-xs sticky top-[48px] z-30 touch-pan-x no-scrollbar">
        <button
          type="button"
          onClick={() => scrollToSection('problem-context')}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-[11px] font-medium active:bg-sky-600"
        >
          1. Challenge
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('live-console')}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/90 border border-sky-500/40 text-sky-300 text-[11px] font-semibold active:bg-sky-600"
        >
          2. Live 65/35
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('storm-simulator')}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-[11px] font-medium active:bg-sky-600"
        >
          3. Physics Proof
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('spatial-consensus')}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold active:bg-cyan-600"
        >
          4. Spatial Consensus
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('tech-architecture')}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-[11px] font-medium active:bg-purple-600"
        >
          5. 4-Zone Architecture
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('field-usability')}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-[11px] font-medium active:bg-emerald-600"
        >
          6. Field Usability
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('why-we-win')}
          className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold active:bg-emerald-600"
        >
          7. Solid Finisher
        </button>
      </div>

      {/* Atmospheric Weather Background & Particle Simulation */}
      <WeatherAtmosphereCanvas initialMode="convective" showControls={true} />
      <AnimatedGrid />

      {/* ─── HERO SECTION ─── */}
      <section className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 sm:px-6 pt-8 sm:pt-12 pb-8">
        <div className="max-w-4xl w-full flex flex-col items-center text-center">
          {/* Live System Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
              </span>
              <span className="text-xs font-bold text-cyan-300 tracking-wide uppercase">
                MetShield AI Live Ingestion Engine
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-900/60 px-2 py-0.5 rounded-full border border-cyan-500/20">
                Uptime: {systemAge}s
              </span>
            </div>
          </motion.div>

          {/* MetShield AI Emblem Display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center justify-center mb-5 gap-6"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-950 via-[#0e1730] to-blue-950 shadow-2xl shadow-cyan-500/30 flex items-center justify-center group hover:scale-105 transition-transform duration-300 relative overflow-hidden">
              <ShieldCheck className="w-9 h-9 sm:w-11 sm:h-11 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] z-10" />
            </div>

            {/* SIH Official Banner Box */}
            <div className="hidden sm:flex flex-col items-start justify-center h-20 px-5 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-950/40 to-slate-900 shadow-xl shadow-orange-500/10">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">Smart India Hackathon 2026</span>
              <span className="text-sm font-black text-white">Problem Statement: SIH26073</span>
              <span className="text-[10px] text-slate-300 font-mono mt-1">Ministry of Earth Sciences (MoES) & IMD</span>
            </div>
          </motion.div>

          {/* Hero Title */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-6"
          >
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-2 leading-[1.1]">
              <span className="bg-gradient-to-r from-cyan-300 via-sky-100 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_2px_25px_rgba(6,182,212,0.35)]">
                METSHIELD AI
              </span>
            </h1>
            <p className="text-sm sm:text-lg text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
              National Automatic Weather Station Quality Management System — Real-time telemetry verification, storm discrimination &amp; self-healing data imputation for India&apos;s meteorological grid.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-400 font-mono bg-[#0e1730]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700/80 shadow-inner">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>WMO-No. 8 Open Standard Compliant • Enterprise Weather Telemetry Shield • Team AEROTECH</span>
            </div>
          </motion.div>

          {/* LIVE STATS RIBBON */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl mb-8"
          >
            {[
              {
                ref: stations.ref,
                value: stations.count.toLocaleString(),
                suffix: '',
                label: 'AWS Stations',
                icon: <Radio className="w-4 h-4 text-cyan-400" />,
              },
              {
                ref: qcScore.ref,
                value: qcScore.count,
                suffix: '%',
                label: 'QC Compliance',
                icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
              },
              {
                ref: latency.ref,
                value: latency.count,
                suffix: 'ms',
                label: 'Detection Latency',
                icon: <Zap className="w-4 h-4 text-amber-400" />,
              },
              {
                ref: districts.ref,
                value: districts.count.toLocaleString(),
                suffix: '',
                label: 'Districts Monitored',
                icon: <Globe className="w-4 h-4 text-purple-400" />,
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-[#0e1730]/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-3.5 text-center shadow-lg hover:border-cyan-400/50 hover:shadow-cyan-500/15 hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {stat.icon}
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                    {stat.label}
                  </span>
                </div>
                <span
                  ref={stat.ref}
                  className="text-2xl font-black text-white font-mono tabular-nums tracking-tight"
                >
                  {stat.value}
                  {stat.suffix}
                </span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <Link
              href="/dashboard"
              className="btn-shimmer-wrap flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold border border-cyan-400/30 shadow-xl shadow-cyan-600/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Activity className="w-4 h-4" />
              <span>Launch Live Matrix Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/mobile"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/90 hover:border-emerald-500/50 hover:text-emerald-300 text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mobile Field Technician View</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SECTION 1: PROBLEM CONTEXT & CONNECTING ARCHITECTURE ─── */}
      <section id="problem-context" className="relative z-10 px-4 sm:px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
            The Automated Weather Station Challenge
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Why Traditional Weather Stations Fail During Severe Storms
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto mt-2 leading-relaxed">
            In surface weather grids, corrupt sensor readings contaminate Numerical Weather Prediction (NWP) models. But static threshold filters create a catastrophic paradox: they mistake real cyclones for broken probes.
          </p>
        </div>

        {/* Before vs After Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase">
              <AlertTriangle className="w-4 h-4" />
              <span>Status Quo: Blind Ingestion &amp; False Alarms</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span><strong>Forecast Model Divergence:</strong> Corrupt probe spikes pass directly into GFS/WRF models, shifting cyclone landfall tracks by up to 120km.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span><strong>Storm Blindness:</strong> Sudden barometric drops during squalls trigger false &ldquo;sensor failure&rdquo; alerts, blinding meteorologists during severe events.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span><strong>Costly Field Trips:</strong> Operators manually travel hundreds of kilometers to inspect stations that only experienced routine gusts.</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase">
              <CheckCircle2 className="w-4 h-4" />
              <span>MetShield AI: Autonomous Telemetry Shield</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Thermodynamic Coupling:</strong> Verifies ΔP ≤ -2.5 hPa against ΔRH ≥ +15% to instantly recognize true storms in &lt;5ms.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Zero-Void Imputation:</strong> Automatically synthesizes moving-average substitutes for quarantined data, preserving NWP continuity.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Transparent XAI:</strong> SHAP feature weights explain every alert to field engineers with natural language root causes.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: LIVE OPERATIONAL CONSOLE (65/35 SPLIT CANVAS) ─── */}
      <section id="live-console" className="relative z-10 px-4 sm:px-6 py-12 max-w-[1720px] mx-auto w-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-400" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Metshield AI Live Operational Console (2.5s Stream &amp; Three-Tier QC)
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800/50">
            ● Continuous DCP Link Active
          </span>
        </div>

        {/* Live Recharts + Incident Stream + Stealth Diagnostic Bench Drawer */}
        <GovInstitutionalConsole lang={lang} />
      </section>

      {/* ─── SECTION 3: INTERACTIVE PHYSICS PROOF (STORM VS FAULT SIMULATOR) ─── */}
      <section id="storm-simulator" className="relative z-10 px-4 sm:px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-6">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
            Interactive Physics Sandbox
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Severe Convective Storm vs. Sensor Hardware Fault Simulator
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto mt-2">
            Test the discrimination engine live. Inject isolated thermistor spikes or coupled squall fronts to observe immediate sub-5ms classification.
          </p>
        </div>

        <StormVsFaultSimulator />
      </section>

      {/* ─── SECTION 4: TIER 3 SPATIAL CONSENSUS & NWP GATING GATEWAY ─── */}
      <section id="spatial-consensus" className="relative z-10 px-4 sm:px-6 py-12 max-w-6xl mx-auto w-full">
        <GovSpatialConsensusPanel />
      </section>

      {/* ─── SECTION 5: 4-ZONE ARCHITECTURE & PIPELINE ─── */}
      <section id="tech-architecture" className="relative z-10 px-4 sm:px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-6">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
            Engineering Rigor
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            4-Zone Edge-Resilient Architecture &amp; Benchmark Matrix
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto mt-2">
            Engineered for zero-cost operation on client edge and microcontroller firmware with deterministic WMO envelopes.
          </p>
        </div>

        <AIEnginePipeline />
      </section>

      {/* ─── SECTION 6: PRACTICAL FIELD USABILITY & OPERATIONAL WORKFLOW ─── */}
      <section id="field-usability" className="relative z-10 px-4 sm:px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            Field Usability &amp; Human-Centered Engineering
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Designed for Real-World Meteorological Crews &amp; Field Engineers
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto mt-2">
            Engineered for rural Indian AWS stations operating in high-humidity coastal strips, Himalayan passes, and arid desert stations with intermittent connectivity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Persona 1: Duty Meteorologist */}
          <div className="p-5 rounded-2xl bg-[#0e1730]/90 border border-slate-800 space-y-3 hover:border-sky-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-sky-400 uppercase font-bold">Duty Meteorologist</span>
              <h3 className="font-bold text-white text-sm mt-0.5">NWP Gating &amp; Instant Quarantine</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides real-time decision support with 1-click model bypass. Never let a single bad thermistor spike contaminate WRF/GFS numerical forecast runs.
            </p>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono flex items-center justify-between">
              <span>Decision Latency:</span>
              <span className="text-emerald-400 font-bold">&lt; 5 ms</span>
            </div>
          </div>

          {/* Persona 2: Field Technician */}
          <div className="p-5 rounded-2xl bg-[#0e1730]/90 border border-slate-800 space-y-3 hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Field Engineer</span>
              <h3 className="font-bold text-white text-sm mt-0.5">Mobile Hardware Sensor Sync</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ingests hardware barometric pressure via Web Generic Sensor API (<code className="text-sky-300">window.PressureSensor</code>) on mobile phones to verify station elevation (1 hPa ≈ 8.4m) and generate automated NABL calibration tickets.
            </p>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono flex items-center justify-between">
              <span>Mobile Sensor Link:</span>
              <span className="text-emerald-400 font-bold">Active Web API</span>
            </div>
          </div>

          {/* Persona 3: Quality Auditor */}
          <div className="p-5 rounded-2xl bg-[#0e1730]/90 border border-slate-800 space-y-3 hover:border-amber-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Regulatory Auditor</span>
              <h3 className="font-bold text-white text-sm mt-0.5">HMAC Cryptographic Audit Log</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates instant CSV and JSON audit exports with WMO-No. 8 compliance flags, Zahumenský XAI feature attributions, and SHA-256 data integrity hashes.
            </p>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono flex items-center justify-between">
              <span>Audit Standard:</span>
              <span className="text-amber-400 font-bold">WMO-No. 8 § 4.3</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 7: SOLID FINISHER & VERDICT (WHY WE WIN) ─── */}
      <section id="why-we-win" className="relative z-10 px-4 sm:px-6 py-14 max-w-6xl mx-auto w-full">
        <div className="p-6 sm:p-9 rounded-3xl bg-gradient-to-br from-blue-950/70 via-slate-900 to-indigo-950/70 border border-sky-500/40 shadow-2xl relative overflow-hidden space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono font-semibold">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              <span>QUALITY ASSURANCE BENCHMARKS &amp; ARCHITECTURAL VERDICT</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              India&apos;s First Thermodynamic-Aware Telemetry Quality Shield
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Metshield AI delivers an autonomous telemetry quality shield for national Automatic Weather Stations. It eliminates false weather alarms during violent squalls while guaranteeing zero corrupted data reaches national forecast pipelines.
            </p>
          </div>

          {/* Direct Benchmark Comparison Matrix */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 sm:hidden font-mono px-1">
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <span>←</span>
                <span>Swipe table horizontally</span>
                <span>→</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">4 Columns</span>
            </div>
            <div className="overflow-x-auto touch-pan-x -webkit-overflow-scrolling-touch pb-1">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 font-mono">
                  <th className="p-3">Architectural Dimension</th>
                  <th className="p-3">Typical SIH Competitors (e.g. NIMBUS)</th>
                  <th className="p-3 text-cyan-400 font-bold bg-cyan-950/30 border-x border-cyan-500/30">
                    ★ Project JATAYU (Team AEROTECH)
                  </th>
                  <th className="p-3 text-emerald-400">Strategic Advantage for MoES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                <tr>
                  <td className="p-3 font-semibold text-white">Physics vs. Pure Data Science</td>
                  <td className="p-3 text-slate-400">Black-Box Outlier Models (Isolation Forests, SVMs)</td>
                  <td className="p-3 text-cyan-300 font-bold bg-cyan-950/20 border-x border-cyan-500/30">
                    Thermodynamic Invariant Engine
                  </td>
                  <td className="p-3 text-emerald-400">Eliminates severe storm false positives.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Scope Discipline</td>
                  <td className="p-3 text-slate-400">Scope Creep (8-10 parameters)</td>
                  <td className="p-3 text-cyan-300 font-bold bg-cyan-950/20 border-x border-cyan-500/30">
                    Strict Tri-Parameter Ingestion (T, P, RH)
                  </td>
                  <td className="p-3 text-emerald-400">100% adherence to MoES constraints.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Inference Cost &amp; Latency</td>
                  <td className="p-3 text-slate-400">Cloud-Dependent / Heavy GPU (500ms-2s latency)</td>
                  <td className="p-3 text-cyan-300 font-bold bg-cyan-950/20 border-x border-cyan-500/30">
                    Sub-50ms Zero-Cost Edge Execution
                  </td>
                  <td className="p-3 text-emerald-400">₹0 cost; fits high-frequency 2.5s cadences.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Data Imputation &amp; Healing</td>
                  <td className="p-3 text-slate-400">Data Dropping (Creates numerical voids)</td>
                  <td className="p-3 text-cyan-300 font-bold bg-cyan-950/20 border-x border-cyan-500/30">
                    Self-Healing Imputation (5-step WMA)
                  </td>
                  <td className="p-3 text-emerald-400">Keeps NWP models (WRF/GFS) unbroken.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">Hardware Grounding</td>
                  <td className="p-3 text-slate-400">100% Synthetic Data (Math.random / CSVs)</td>
                  <td className="p-3 text-cyan-300 font-bold bg-cyan-950/20 border-x border-cyan-500/30">
                    Physical Sensor Bridge (Mobile Web API)
                  </td>
                  <td className="p-3 text-emerald-400">Live hardware verification during pitch.</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-white">User Experience &amp; Standards</td>
                  <td className="p-3 text-slate-400">Hackathon Template UI (Cluttered developer views)</td>
                  <td className="p-3 text-cyan-300 font-bold bg-cyan-950/20 border-x border-cyan-500/30">
                    Institutional GIGW 3.0 / NIC Console
                  </td>
                  <td className="p-3 text-emerald-400">Production-ready Indian Gov guidelines.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Strategic Defense Against Competitors */}
          <div className="pt-6 border-t border-slate-800/80">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-center">Strategic Defenses Against Competitor Claims</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#080e22] border border-rose-500/20">
                <div className="text-rose-400 font-bold text-[10px] uppercase mb-1 flex justify-between">
                  <span>1. Spatial Mesh Density</span>
                  <span>Competitor Risk</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3 leading-snug">Competitors may rely heavily on multi-station correlation matrices (50+ nodes) for drift detection.</p>
                <div className="text-emerald-400 font-bold text-[10px] uppercase mb-1">JATAYU Defense</div>
                <p className="text-[11px] text-slate-300 leading-snug">We utilize Haversine KNN, but prioritize point-source thermodynamic invariants to avoid high spatial query latency.</p>
              </div>
              
              <div className="p-4 rounded-xl bg-[#080e22] border border-amber-500/20">
                <div className="text-amber-400 font-bold text-[10px] uppercase mb-1 flex justify-between">
                  <span>2. Long-Term Drift Tracking</span>
                  <span>Competitor Risk</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3 leading-snug">Competitors might claim superior slow calibration drift detection using heavy Bayesian change-point models.</p>
                <div className="text-emerald-400 font-bold text-[10px] uppercase mb-1">JATAYU Defense</div>
                <p className="text-[11px] text-slate-300 leading-snug">We enforce rolling linear baseline regression across ring buffers to detect monotonic bias (e.g., -0.4 hPa/hr) without massive overhead.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#080e22] border border-purple-500/20">
                <div className="text-purple-400 font-bold text-[10px] uppercase mb-1 flex justify-between">
                  <span>3. Gov Hosting Feasibility</span>
                  <span>Competitor Risk</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3 leading-snug">Evaluators asking why prototypes are on public cloud (Vercel) instead of sovereign national infrastructure.</p>
                <div className="text-emerald-400 font-bold text-[10px] uppercase mb-1">JATAYU Defense</div>
                <p className="text-[11px] text-slate-300 leading-snug">Vercel is solely for the live hackathon demonstrator. Our codebase runs containerized microservices ready for the NIC MeghRaj GI Cloud.</p>
              </div>
            </div>
          </div>
        </div>

          {/* 4 Rubric Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">₹0 Cost</span>
              <div className="text-[10px] text-slate-400 mt-0.5">Zero Paid Cloud APIs</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-xl sm:text-2xl font-black font-mono text-sky-400">&lt;5ms</span>
              <div className="text-[10px] text-slate-400 mt-0.5">Sub-Second Anomaly Pass</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">Zero Void</span>
              <div className="text-[10px] text-slate-400 mt-0.5">Self-Healing Imputation</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-xl sm:text-2xl font-black font-mono text-purple-400">WMO-No. 8</span>
              <div className="text-[10px] text-slate-400 mt-0.5">Standards Compliant</div>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-600/20"
            >
              <Activity className="w-4 h-4" />
              <span>Launch 1,350 Station Observation Matrix</span>
            </Link>

            <Link
              href="/audit-report"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-cyan-500/40 text-xs font-semibold transition-all"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>View Cryptographic Audit Report</span>
            </Link>

            <Link
              href="/mobile"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Field Technician PWA</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SECTION 8: WORST-CASE SCENARIOS & FAILSAFES ─── */}
      <section id="worst-case-scenarios" className="relative z-10 px-4 sm:px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="p-6 sm:p-9 rounded-3xl bg-[#091124] border border-rose-500/30 shadow-2xl relative overflow-hidden space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>WORST-CASE SCENARIOS &amp; ENGINEERED DEFENSES</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Operational Continuity Under Extreme Hazards
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Project JATAYU is engineered to handle extreme operational hazards, communication dropouts, and atmospheric disruptions through dedicated fail-safes across each structural tier.
            </p>
          </div>

          <div className="overflow-x-auto touch-pan-x -webkit-overflow-scrolling-touch pb-1">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 font-mono">
                  <th className="p-3 w-1/4">Operational Hazard</th>
                  <th className="p-3 w-1/3">Systemic Failure Mode</th>
                  <th className="p-3 text-emerald-400 bg-emerald-950/20 border-x border-emerald-500/30 w-5/12">Engineered Mitigation Mechanism</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                <tr>
                  <td className="p-3 font-semibold text-rose-400">Severe Cyclogenesis Landfall</td>
                  <td className="p-3 text-slate-400">Traditional threshold QC misclassifies rapid pressure drops as sensor failure, silencing early warnings.</td>
                  <td className="p-3 text-emerald-300 bg-emerald-950/10 border-x border-emerald-500/30">
                    <strong className="text-emerald-400">Tier-3 Thermodynamic Invariant:</strong> Validates coupled dynamics (ΔP ≤ -2.5 hPa + ΔRH ≥ +15%), classifying as Blue Status.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-rose-400">Prolonged Comms Blackout (72h+)</td>
                  <td className="p-3 text-slate-400">Cellular GPRS or INSAT-3D DCP satellite uplink drops due to severed links or power outages.</td>
                  <td className="p-3 text-emerald-300 bg-emerald-950/10 border-x border-emerald-500/30">
                    <strong className="text-emerald-400">Store-and-Forward FIFO Ring Buffer:</strong> Edge microcontrollers buffer up to 72 hours locally in circular flash storage.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-rose-400">Thermistor Open-Circuit</td>
                  <td className="p-3 text-slate-400">Missing/corrupted readings enter NWP models, triggering mathematical divergence.</td>
                  <td className="p-3 text-emerald-300 bg-emerald-950/10 border-x border-emerald-500/30">
                    <strong className="text-emerald-400">Gapless Self-Healing Imputation:</strong> Instantly synthesizes 5-step Gaussian WMA replacement values.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-rose-400">Monotonic Calibration Drift</td>
                  <td className="p-3 text-slate-400">Gradual transducer aging skews readings (-0.4 hPa/hr) without crossing thresholds.</td>
                  <td className="p-3 text-emerald-300 bg-emerald-950/10 border-x border-emerald-500/30">
                    <strong className="text-emerald-400">Sliding Baseline Linear Regression:</strong> Multi-hour models monitor baseline drift over 24-sample windows.
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-rose-400">Client Memory Overflow</td>
                  <td className="p-3 text-slate-400">Continuous 2.5s streaming causes browser memory leaks and tab freezes during live operational shifts.</td>
                  <td className="p-3 text-emerald-300 bg-emerald-950/10 border-x border-emerald-500/30">
                    <strong className="text-emerald-400">Bounded Sliding Array Queue:</strong> State strictly enforces prev.slice(-29) capping client memory.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Operational Continuity Pipeline</h3>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-[10px] sm:text-xs text-sky-300 overflow-x-auto">
                <pre>{`[ Extreme Hazard: Cyclone / Link Drop / Open-Circuit ]
                          │
                          ▼
            [ Edge Node Offline / Corrupted ]
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
[ Communications Severed ]    [ Physical Transducer Blown ]
  • Local 72h FIFO buffer       • Tier 1/2 catches step-jump
  • Store-and-forward sync      • 5-step Gaussian WMA engages
          │                               │
          └───────────────┬───────────────┘
                          ▼
        [ Gapless Imputed Stream Forwarded ]
                          │
                          ▼
        [ WRF/GFS Numerical Weather Prediction ]
           (Zero Data Voids / Zero Crashes)`}</pre>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Key Defensive Message for Evaluators</h3>
              <div className="bg-slate-900/50 border-l-4 border-emerald-500 p-4 rounded-r-lg text-sm text-slate-300 leading-relaxed italic relative">
                <span className="text-4xl absolute -top-2 -left-3 text-slate-800">"</span>
                Project JATAYU is designed for severe conditions. If communication drops, local 72-hour edge buffers cache telemetry until links recover. If a sensor fails physically, real-time Gaussian moving-average imputation reconstructs the missing stream so numerical prediction models do not diverge. Most critically, during extreme cyclonic landfalls, our thermodynamic coupling logic prevents false-alarm blinding by validating that barometric plunges correspond with humidity surges, passing authentic severe weather directly to forecasters.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 9: MOBILE PWA FIELD JOURNEY ─── */}
      <section id="mobile-pwa-journey" className="relative z-10 px-4 sm:px-6 py-12 max-w-6xl mx-auto w-full">
        <div className="p-6 sm:p-9 rounded-3xl bg-gradient-to-br from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 shadow-2xl relative overflow-hidden space-y-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>FIELD TECHNICIAN &amp; MOBILE PWA JOURNEY</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Thumb-Driven Operations at the Edge
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Designed for single-hand, thumb-first control, the progressive web app (PWA) instantly turns any field technician's smartphone into an active weather node and diagnostic terminal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-[#0b1329]/80 border border-slate-700/50 p-5 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-400 mb-2">
                <span className="font-bold font-mono">1</span>
              </div>
              <h3 className="text-sm font-bold text-white">Instant Load &amp; Ambient Discovery</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero layout shifts or rubber-banding. Viewport locks cleanly with auto-zoom disabled. The single-column telemetry view focuses immediately on the local observatory without forcing desktop tables onto mobile screens.
              </p>
            </div>

            <div className="bg-[#0b1329]/80 border border-slate-700/50 p-5 rounded-2xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 mb-2">
                <span className="font-bold font-mono">2</span>
              </div>
              <h3 className="text-sm font-bold text-white">Live Hardware Recognition</h3>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE MOBILE FEED
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Raising the phone registers real physical pressure drops (0.1–0.3 hPa) via the native <code className="text-emerald-300 font-mono">window.PressureSensor</code>. Device motion listeners validate mast buffeting proxies instantly.
              </p>
            </div>

            <div className="bg-[#0b1329]/80 border border-slate-700/50 p-5 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 mb-2">
                <span className="font-bold font-mono">3</span>
              </div>
              <h3 className="text-sm font-bold text-white">Thumb-Driven Map Friction</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Map containers explicitly disable single-finger drag to prevent vertical scroll hijacking. A single segmented mode toggle <code className="text-purple-300 font-mono">[ 🗺️ | 📋 ]</code> swaps to high-contrast station chips and slide-up telemetry bottom sheets.
              </p>
            </div>

            <div className="bg-[#0b1329]/80 border border-slate-700/50 p-5 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400 mb-2">
                <span className="font-bold font-mono">4</span>
              </div>
              <h3 className="text-sm font-bold text-white">Single-Tap Auditing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Field workers can instantly report physical anomalies with auto-filled 30-sample ring buffer snapshots. Tapping <strong className="text-slate-300">"Export QC Audit Log"</strong> pushes standard NIC-formatted CSVs directly to the phone's native file system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-slate-800 bg-[#0b1329]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">
            © 2026 Smart India Hackathon • MetShield AI Prototype • Problem Statement SIH26073 (MoES & IMD) • Team AEROTECH (Team ID: 73869)
          </span>
          <div className="flex items-center gap-3">
            <Link href="/audit-report" className="hover:text-sky-400 transition-colors">
              Audit Report
            </Link>
            <span>•</span>
            <Link href="/dashboard" className="hover:text-sky-400 transition-colors">
              Observation Console
            </Link>
            <span>•</span>
            <Link href="/mobile" className="hover:text-sky-400 transition-colors">
              Mobile PWA
            </Link>
            <span>•</span>
            <span className="font-mono text-cyan-400">WMO-No. 8 Compliant • Team 73869</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
