'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  Activity,
  ShieldCheck,
  Zap,
  Radio,
  Globe,
  Smartphone,
  Cpu,
  ArrowRight,
  Database,
} from 'lucide-react';
import { StormVsFaultSimulator } from '@/components/StormVsFaultSimulator';
import { WeatherAtmosphereCanvas } from '@/components/WeatherAtmosphereCanvas';

/* ─── Animated Counter Hook ─── */
function useCounter(target: number, duration = 2000, decimals = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute w-full h-[50vh] top-0 opacity-20"
        style={{
          background: 'linear-gradient(to bottom, #0284c7 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}

/* ─── Main Landing Page ─── */
export default function LandingPage() {
  const [systemAge, setSystemAge] = useState(0);

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

  return (
    <div className="min-h-screen bg-[#070d1e] text-white flex flex-col relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* ─── National Color Accent Strip ─── */}
      <div
        className="w-full h-[3px] flex shrink-0 sticky top-0 z-50"
        style={{
          background: 'linear-gradient(to right, #FF9933 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #138808 66.6%)',
        }}
      />

      <WeatherAtmosphereCanvas initialMode="convective" showControls={false} />
      <AnimatedGrid />

      {/* ─── Top Navigation ─── */}
      <header className="relative z-40 px-6 py-4 flex items-center justify-between max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              METSHIELD AI
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                v4.2
              </span>
            </h1>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
              Team 73869 • AEROTECH
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            SYSTEM ONLINE: {systemAge}s
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="flex-1 flex flex-col items-center justify-center relative z-20 px-4 py-16 text-center max-w-5xl mx-auto w-full mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center justify-center gap-2 mb-6 text-cyan-400 text-sm font-semibold tracking-widest uppercase">
            <Cpu className="w-4 h-4" /> Edge-Computed Thermodynamic Telemetry
          </div>

          <h2 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[1.05] mb-6">
            Account-Free Edge QMS<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 drop-shadow-lg">
              For Ground-Truth Weather.
            </span>
          </h2>

          <p className="text-lg sm:text-xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed mb-10">
            A zero-cost, local-first hybrid architecture that instantaneously discriminates between hardware faults and real severe weather in under 5ms, without ever touching a database.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-900 duration-200"
            >
              <Activity className="w-5 h-5" />
              <span>Launch Desktop Ops Console</span>
            </Link>

            <Link
              href="/mobile"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700 hover:border-slate-500 duration-200"
            >
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>Open Field Node (PWA)</span>
            </Link>
          </div>
        </motion.div>

        {/* ─── LIVE STATS ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full"
        >
          {[
            { ref: stations.ref, count: stations.count, suffix: '', label: 'Live AWS Nodes', icon: Radio, col: 'text-cyan-400' },
            { ref: qcScore.ref, count: qcScore.count, suffix: '%', label: 'QC Compliance', icon: ShieldCheck, col: 'text-emerald-400' },
            { ref: latency.ref, count: latency.count, suffix: 'ms', label: 'Detection Speed', icon: Zap, col: 'text-amber-400' },
            { ref: districts.ref, count: districts.count, suffix: '', label: 'Districts Secured', icon: Globe, col: 'text-purple-400' }
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900/40 backdrop-blur border border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-800/60 transition-colors">
              <div className="flex justify-center mb-3">
                <stat.icon className={`w-6 h-6 ${stat.col}`} />
              </div>
              <div ref={stat.ref} className="text-3xl font-black tabular-nums tracking-tighter">
                {stat.count}{stat.suffix}
              </div>
              <div className="mt-1 text-xs text-slate-400 font-medium uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ─── THE PITCH / PHYSICS SIMULATOR ─── */}
      <section className="relative z-20 px-4 py-20 bg-slate-950/50 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-4">Core Innovation: The Thermodynamic Engine</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Legacy rule engines throw away vital severe weather data by mistaking massive barometric pressure drops for broken sensors. Try the interactive engine below to see how MetShield solves the SIH 26073 problem through cross-parameter validation.
            </p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-2 sm:p-6 shadow-2xl">
            <StormVsFaultSimulator />
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-20 border-t border-slate-800 bg-[#070d1e] py-8 text-center text-sm text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span className="font-mono">Zero-Cost Architecture • IndexedDB & BroadcastChannel Powered</span>
          </div>
          <div>© 2026 MetShield AI • Team AEROTECH (73869)</div>
        </div>
      </footer>
    </div>
  );
}
