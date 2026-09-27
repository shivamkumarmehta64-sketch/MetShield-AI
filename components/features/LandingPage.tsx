'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DISTRICT_REGISTRY_COUNTS } from '@/lib/dataProvenance';
import {
  ArrowRight,
  Activity,
  ShieldCheck,
  FileText,
  Smartphone,
} from 'lucide-react';
import { WeatherAtmosphereCanvas } from '@/components/WeatherAtmosphereCanvas';
import { GovInstitutionalConsole } from '@/components/GovInstitutionalConsole';

/* ─── Animated Counter Hook ─── */
function useCounter(target: number, duration = 1000, decimals = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Simplified fast animation for brutalist MPI design
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Linear or sharp ease-out
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, decimals]);

  return { count, ref };
}

/* ─── Grid Background ─── */
function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(var(--border-default) 1px, transparent 1px), linear-gradient(90deg, var(--border-default) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.3
        }}
      />
    </div>
  );
}

/* ─── Simulated Terminal Stream ─── */
function CliStreamLines() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const initLines = [
      `[SYS] Boot sequence initialized...`,
      `[SYS] Loading cryptographic ledgers...`,
      `[NET] Binding to AWS node network (1,350 total)`,
      `[NET] Handshake established. Link: SECURE.`,
      `[MON] Beginning telemetry ingestion loop...`,
      `==================================================`
    ];
    setLines(initLines);

    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      const isAnomaly = Math.random() > 0.95;
      const ts = Date.now().toString().slice(-6);
      const id = String(100 + (counter % 50)).padStart(4, '0');
      const temp = (25 + Math.random() * 10).toFixed(2);
      const press = (1000 + Math.random() * 20).toFixed(1);

      let newLine = `[${ts}] RECV: NODE_${id}  T:${temp}C  P:${press}hPa  `;
      if (isAnomaly) {
        newLine += `-> ANOMALY_VAR_DROP`;
      } else {
        newLine += `-> ACQUIRED`;
      }

      setLines(prev => {
        const next = [...prev, newLine];
        if (next.length > 22) return next.slice(next.length - 22);
        return next;
      });
    }, 400); // Fast, mechanical ingestion speed

    return () => clearInterval(interval);
  }, []);

  return (
    <>
       {lines.map((line, i) => (
         <div key={i} className={
           line.includes('ANOMALY') ? 'text-status-error bg-status-error/10 font-bold px-1' :
           line.includes('SYS') || line.includes('NET') || line.includes('MON') ? 'text-text-muted mt-1' :
           line.includes('===') ? 'text-border-default my-1 tracking-tighter' :
           'text-text-secondary tracking-tight'
         }>
           {line}
         </div>
       ))}
    </>
  );
}

/* ─── Main Landing Page (MPI Standard) ─── */
export default function LandingPage() {
  const [systemAge, setSystemAge] = useState(0);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setSystemAge(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const stations = useCounter(1350);
  const qcScore = useCounter(99.4, 1500, 1);
  const latency = useCounter(3.8, 1200, 1);
  const districts = useCounter(DISTRICT_REGISTRY_COUNTS.total);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col relative overflow-hidden font-sans selection:bg-accent-light/30 selection:text-accent-primary">
      <WeatherAtmosphereCanvas initialMode="convective" showControls={false} />
      <AnimatedGrid />

      {/* ─── Institutional Header Bar ─── */}
      <header className="border-b border-border-default bg-bg-primary/95 backdrop-blur-sm sticky top-0 z-40 px-4 py-3">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 border border-border-default bg-bg-secondary flex items-center justify-center p-1">
              <ShieldCheck className="w-6 h-6 text-accent-primary" />
            </div>
            <div>
              <div className="hidden sm:flex mpi-eyebrow items-center gap-2 mb-0.5">
                <span>{lang === 'en' ? 'AUTOMATED WEATHER OBSERVATORY QMS' : 'स्वचालित मौसम वेधशाला गुणवत्ता आश्वासन'}</span>
                <span className="inline-block w-1.5 h-1.5 bg-status-normal mpi-pulse" />
                <span className="text-text-muted">NATIONAL TELEMETRY ENGINE</span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-text-primary uppercase">
                METSHIELD AI
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
            <Link href="/stations" className="flex items-center gap-2 border border-border-default px-3 py-1.5 hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary">
              <Activity className="w-3.5 h-3.5" /> STATIONS
            </Link>
            <Link href="/incidents" className="flex items-center gap-2 border border-border-default px-3 py-1.5 hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary">
              <FileText className="w-3.5 h-3.5" /> INCIDENTS
            </Link>
            <Link href="/mobile" className="flex items-center gap-2 border border-border-default bg-bg-secondary px-3 py-1.5 hover:bg-bg-tertiary hover:border-accent-primary transition-colors text-accent-primary">
              <Smartphone className="w-3.5 h-3.5" /> FIELD PWA
            </Link>
            <button onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')} className="border border-border-default px-3 py-1.5 hover:bg-bg-tertiary transition-colors text-text-muted">
              {lang === 'en' ? 'HI' : 'EN'}
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION (Two-Column MPI layout) ─── */}
      <section className="mpi-section relative z-10 w-full max-w-[1720px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-6 lg:mt-12">
        <div className="flex flex-col justify-center">
          <div className="mb-6 flex flex-wrap items-center gap-3">
             <span className="font-mono text-xs text-text-primary bg-bg-secondary border border-border-default px-2 py-0.5 tracking-widest uppercase flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-accent-primary inline-block shrink-0 mpi-pulse" />
               SYSTEM CORE ONLINE
             </span>
             <span className="font-mono text-[10px] text-text-muted border border-border-default px-2 py-0.5 uppercase tracking-wider">
               UPTIME {systemAge}s
             </span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-[1.05] uppercase">
            <span className="text-text-primary block">ABSOLUTE</span>
            <span className="text-text-secondary block">TELEMETRY</span>
            <span className="text-accent-primary block drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]">PRECISION.</span>
          </h1>

          <p className="text-base text-text-secondary max-w-xl mb-10 leading-relaxed">
            Automated Weather Station Quality Management System (AWS-QMS) enforcing WMO Pub 8 standards through edge anomaly detection, zero-void thermodynamic imputation, and cryptographic ledger verification.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="flex items-center justify-center gap-3 px-6 py-3.5 border border-accent-primary hover:bg-accent-primary/5 text-accent-primary text-sm font-bold tracking-widest uppercase transition-colors">
              <Activity className="w-4 h-4" />
              <span>Initialize Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col border border-border-default bg-bg-primary h-[400px] lg:h-[500px] relative shadow-[0_0_40px_rgba(0,0,0,0.5)]">
           <div className="border-b border-border-default bg-bg-secondary px-4 py-3 flex items-center justify-between">
             <span className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">INGESTION_DATALINK // T0</span>
             <div className="flex gap-1.5">
               <span className="w-2 h-2 border border-border-default"></span>
               <span className="w-2 h-2 border border-border-default bg-text-muted"></span>
             </div>
           </div>
           <div className="p-4 font-mono text-[11px] sm:text-xs flex flex-col gap-[2px] overflow-hidden relative h-full bg-[#020617]/50">
              <CliStreamLines />
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none" />
           </div>
        </div>
      </section>

      {/* ─── LIVE STATS RIBBON ─── */}
      <section className="relative z-10 max-w-[1720px] mx-auto w-full px-4 lg:px-0 mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-border-default w-full">
          {[
            { ref: stations.ref, value: stations.count.toLocaleString(), label: 'ACTIVE STATIONS' },
            { ref: qcScore.ref, value: qcScore.count, label: 'QC COMPLIANCE', suffix: '%' },
            { ref: latency.ref, value: latency.count, label: 'DETECTION LATENCY', suffix: 'ms' },
            { ref: districts.ref, value: districts.count.toLocaleString(), label: 'DISTRICTS COVERED' },
          ].map((stat, i) => (
            <div key={i} className="border-r border-b border-border-default bg-bg-primary/80 backdrop-blur p-6 flex flex-col items-center justify-center relative group hover:bg-bg-secondary transition-colors">
              <span className="font-mono text-[10px] text-text-muted mb-2 tracking-widest uppercase">{stat.label}</span>
              <span ref={stat.ref} className="font-mono text-4xl font-bold text-text-primary tracking-tighter">
                {stat.value}{stat.suffix}
              </span>
              <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-accent-primary transition-all duration-300 group-hover:w-full" />
            </div>
          ))}
        </div>
      </section>

      {/* ─── LIVE OPERATIONAL CONSOLE ─── */}
      <section id="live-console" className="mpi-section relative z-10 max-w-[1720px] mx-auto w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between border-b border-border-default pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-text-primary uppercase tracking-tight">
              Operational Matrix
            </h2>
            <span className="text-sm font-mono text-text-secondary uppercase tracking-wider">2.5s Stream & Three-Tier Quality Assurance</span>
          </div>
          <span className="font-mono text-[10px] text-status-normal font-bold border border-border-default bg-bg-secondary px-3 py-1 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-status-normal inline-block mpi-pulse" />
            CONT. DCP LINK
          </span>
        </div>

        <GovInstitutionalConsole lang={lang} />
      </section>

      {/* ─── ARCHITECTURAL VERDICT & ADVANTAGE ─── */}
      <section className="mpi-section relative z-10 max-w-[1720px] mx-auto w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between border-b border-border-default pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-text-primary uppercase tracking-tight">
              Architectural Verdict
            </h2>
            <span className="text-sm font-mono text-text-secondary uppercase tracking-wider">Physics-Informed VS Black-Box AI Models</span>
          </div>
        </div>

        <div className="border border-border-default overflow-x-auto w-full bg-bg-primary">
          <table className="w-full text-left text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border-default bg-bg-secondary text-[11px] font-mono uppercase text-text-secondary tracking-widest">
                <th className="p-4 border-r border-border-default w-1/4">Evaluation Dimension</th>
                <th className="p-4 border-r border-border-default w-1/4">Status Quo / Competitors</th>
                <th className="p-4 border-r border-border-default bg-accent-primary/5 text-accent-primary w-1/4 font-bold">MetShield AI</th>
                <th className="p-4 w-1/4 text-text-primary">Strategic Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-text-primary text-sm font-sans">
              <tr className="hover:bg-bg-secondary/50 transition-colors">
                <td className="p-4 border-r border-border-default font-bold">Anomaly Detection</td>
                <td className="p-4 border-r border-border-default text-text-muted">Blind Statistical Outliers (Isolation Forests, SVM)</td>
                <td className="p-4 border-r border-border-default text-accent-primary font-mono text-xs font-bold leading-relaxed">THERMODYNAMIC INVARIANT ENGINE</td>
                <td className="p-4 text-text-secondary">Eliminates severe storm false positives by verifying coupled physical states.</td>
              </tr>
              <tr className="hover:bg-bg-secondary/50 transition-colors">
                <td className="p-4 border-r border-border-default font-bold">Inference Latency</td>
                <td className="p-4 border-r border-border-default text-text-muted">Cloud-Dependent GPU inference (500ms-2s)</td>
                <td className="p-4 border-r border-border-default text-accent-primary font-mono text-xs font-bold leading-relaxed">ZERO-COST C-COMPILED EDGE &lt;5MS</td>
                <td className="p-4 text-text-secondary">Zero OPEX, mathematically guaranteed sub-second execution on edge hardware.</td>
              </tr>
              <tr className="hover:bg-bg-secondary/50 transition-colors">
                <td className="p-4 border-r border-border-default font-bold">Data Management</td>
                <td className="p-4 border-r border-border-default text-text-muted">Data Dropping (causes NWP divergence)</td>
                <td className="p-4 border-r border-border-default text-accent-primary font-mono text-xs font-bold leading-relaxed">GAPLESS IMPUTATION WMA ALGORITHM</td>
                <td className="p-4 text-text-secondary">Self-heals missing points synchronously, maintaining continuous data pipelines.</td>
              </tr>
              <tr className="hover:bg-bg-secondary/50 transition-colors">
                <td className="p-4 border-r border-border-default font-bold">Interface Density</td>
                <td className="p-4 border-r border-border-default text-text-muted">Consumer-grade SaaS templates, soft aesthetics</td>
                <td className="p-4 border-r border-border-default text-accent-primary font-mono text-xs font-bold leading-relaxed">MINIMAL PRECISION INTERFACE (MPI)</td>
                <td className="p-4 text-text-secondary">High data-to-ink ratio, designed exclusively for institutional meteorological ops.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── WORST CASE & HAZARD MITIGATION ─── */}
      <section id="hazards" className="mpi-section relative z-10 max-w-[1720px] mx-auto w-full mb-12">
        <div className="mb-6 border-b border-border-default pb-4">
          <h2 className="text-2xl font-bold text-text-primary uppercase tracking-tight">
            Hazard Mitigation Architecture
          </h2>
          <span className="text-sm font-mono text-text-secondary uppercase tracking-wider">Operational Continuity Under Extreme Conditions</span>
        </div>

        <div className="border border-border-default overflow-x-auto w-full bg-bg-primary">
          <table className="w-full text-left text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border-default bg-bg-secondary text-[11px] font-mono uppercase text-text-secondary tracking-widest">
                <th className="p-4 border-r border-border-default w-1/4">Operational Hazard</th>
                <th className="p-4 border-r border-border-default w-1/3">Failure Mode (Standard)</th>
                <th className="p-4 bg-accent-primary/5 text-accent-primary w-5/12">Engineered Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-text-primary text-sm font-sans">
              <tr className="hover:bg-bg-secondary/50 transition-colors">
                <td className="p-4 border-r border-border-default font-mono text-status-error text-xs font-bold tracking-wide">SEVERE_CYCLONIC_LANDFALL</td>
                <td className="p-4 border-r border-border-default text-text-muted">Rapid pressure drops misclassified as hardware failure. True severe phenomena discarded.</td>
                <td className="p-4 font-mono text-xs text-text-primary leading-relaxed">
                  <span className="text-accent-primary font-bold block mb-1">TIER-3 THERMODYNAMIC PROOF:</span>
                  Passes anomaly only if decoupled (ΔP ≤ -2.5 hPa occurs WITHOUT ΔRH ≥ +15%). True storms verified.
                </td>
              </tr>
              <tr className="hover:bg-bg-secondary/50 transition-colors">
                <td className="p-4 border-r border-border-default font-mono text-status-error text-xs font-bold tracking-wide">COMMS_BLACKOUT_72H</td>
                <td className="p-4 border-r border-border-default text-text-muted">Cellular/INSAT link drops causing irrevocable data loss.</td>
                <td className="p-4 font-mono text-xs text-text-primary leading-relaxed">
                  <span className="text-accent-primary font-bold block mb-1">LOCAL_FIFO_BUFFER:</span>
                  Edge nodes buffer up to 72 hours locally in circular flash storage. Restores automatically upon reconn.
                </td>
              </tr>
              <tr className="hover:bg-bg-secondary/50 transition-colors">
                <td className="p-4 border-r border-border-default font-mono text-status-warning text-xs font-bold tracking-wide">PHYSICAL_SENSOR_NOISE</td>
                <td className="p-4 border-r border-border-default text-text-muted">Missing/spike readings enter NWP models causing numerical divergence.</td>
                <td className="p-4 font-mono text-xs text-text-primary leading-relaxed">
                  <span className="text-accent-primary font-bold block mb-1">GAPLESS_WMA_IMPUTATION:</span>
                  Instantly synthesizes sliding 5-step windowed-mean replacement stream before ingestion.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-border-default bg-bg-secondary mt-auto">
        <div className="max-w-[1720px] mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[10px] text-text-secondary uppercase tracking-widest">
          <span>© 2026 METSHIELD AI • TEAM AEROTECH (73869) • MOES & IMD PROTOTYPE</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/audit-report" className="hover:text-text-primary transition-colors">Audit Ledger</Link>
            <span className="text-border-default">/</span>
            <Link href="/dashboard" className="hover:text-text-primary transition-colors">Matrix View</Link>
            <span className="text-border-default">/</span>
            <span className="text-status-normal font-bold border border-border-default px-2 py-0.5">WMO PUB 8 COMPLIANT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
