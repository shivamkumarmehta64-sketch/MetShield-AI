'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, ShieldCheck, Clock, Globe, Eye, BookOpen, Layers, Server, FileText, Smartphone, Menu, X, Home, Activity, FileCheck, Cpu } from 'lucide-react';
import { ActiveModalType } from './GovInfoModals';

interface GovHeaderProps {
  fontSizeLevel: number;
  onFontSizeChange: (delta: number) => void;
  isHighContrast: boolean;
  onToggleContrast: () => void;
  isMissionControl?: boolean;
  onToggleMissionControl?: () => void;
  language: 'hi' | 'en';
  onToggleLanguage: () => void;
  onOpenModal: (type: ActiveModalType) => void;
  onOpenDatasetReplay?: () => void;
  onOpenMobileQR?: () => void;
  isLiveApiMode?: boolean;
}

export const GovHeader = React.memo<GovHeaderProps>(function GovHeader({
  fontSizeLevel, onFontSizeChange, isHighContrast, onToggleContrast,
  language, onToggleLanguage, onOpenModal, onOpenDatasetReplay, onOpenMobileQR, isLiveApiMode = true,
}) {
  const pathname = usePathname();
  const [istTime, setIstTime] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const tick = () => setIstTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST');
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-[#0b1329] shadow-md sticky top-0 z-50 text-white font-sans">
      {/* Sleek Cyan-Blue Gradient Accent Band */}
      <div className="h-[3px] w-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600" />

      {/* Top Utility Bar */}
      <div className="bg-[#070d1e] border-b border-slate-800/80 text-slate-300">
        <div className="max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-xs">
          {/* System Status Tag */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-bold text-cyan-400 text-[11px] sm:text-xs tracking-tight flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Metshield Telemetry QMS
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="font-medium text-slate-300 truncate text-[11px] sm:text-xs">
              Automated Weather Station Quality Management System (AWS-QMS)
            </span>
          </div>

          {/* Accessibility & Utility Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Font Size Adjusters */}
            <div className="hidden sm:flex items-center bg-[#0e1730] border border-slate-700/80 rounded px-1.5 py-0.5 space-x-1">
              <span className="text-[10px] text-slate-400 mr-1">Font:</span>
              {[-1, 0, 1].map(level => (
                <button
                  key={level}
                  onClick={() => onFontSizeChange(level)}
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold transition-all ${
                    fontSizeLevel === level ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Adjust Font Size"
                >
                  {level === -1 ? 'A-' : level === 0 ? 'A' : 'A+'}
                </button>
              ))}
            </div>

            {/* High Contrast */}
            <button
              onClick={onToggleContrast}
              title="Toggle High Contrast"
              className={`p-1 sm:px-2 sm:py-0.5 rounded border text-[10px] transition-all flex items-center gap-1 ${
                isHighContrast ? 'bg-yellow-400 text-slate-950 border-yellow-500 font-bold' : 'bg-[#0e1730] text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">{isHighContrast ? 'High Contrast' : 'Contrast'}</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={onToggleLanguage}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-700 bg-[#0e1730] text-cyan-300 font-bold text-[10px] hover:bg-slate-800 transition-colors"
              title="Switch Language"
            >
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>{language === 'hi' ? 'English' : 'हिन्दी'}</span>
            </button>

            {/* Live IST Clock */}
            <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] bg-[#0e1730] text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded font-semibold">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span suppressHydrationWarning>{istTime || 'IST'}</span>
            </div>

            {/* Mobile Drawer Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="xl:hidden p-1.5 rounded bg-[#0e1730] border border-slate-700 text-slate-200 hover:text-white touch-target flex items-center justify-center"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5 text-cyan-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Metshield AI Header Masthead */}
      <div className="bg-[#0b1329] text-white">
        <div className="max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-4">
          {/* Identity & Logo */}
          <div className="flex items-center gap-3">
            {/* Metshield AI Emblem */}
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl border border-cyan-400/50 bg-gradient-to-br from-cyan-950 via-[#0e1730] to-blue-950 shadow-lg shadow-cyan-500/20 shrink-0 flex items-center justify-center group hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                  <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent font-extrabold">METSHIELD</span>
                  <span className="text-cyan-400 font-extrabold">AI</span>
                </span>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-400/40">
                  AWS-QMS
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-400/40 hidden sm:inline">
                  WMO-No. 8 Aligned
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                {language === 'hi'
                  ? 'स्वचालित मौसम स्टेशन गुणवत्ता प्रबंधन प्रणाली • 24x7 इंटेलिजेंट वेदर टेलीमेट्री'
                  : 'Automated Weather Station Quality Management System • 24x7 Intelligent Telemetry'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation & Utilities */}
          <div className="hidden xl:flex items-center gap-3 text-xs">
            {([
              { modal: 'architecture' as const, icon: <Server className="w-3.5 h-3.5 text-cyan-400" />, en: 'Architecture', hi: 'संरचना' },
              { modal: 'methodology' as const, icon: <BookOpen className="w-3.5 h-3.5 text-sky-400" />, en: 'WMO Standards', hi: 'मानक' },
              { modal: 'security' as const, icon: <Shield className="w-3.5 h-3.5 text-emerald-400" />, en: 'Zero-Trust', hi: 'सुरक्षा' },
              { modal: 'provenance' as const, icon: <Layers className="w-3.5 h-3.5 text-purple-400" />, en: 'Data Engine', hi: 'डेटा इंजन' },
            ]).map((item) => (
              <button
                key={item.modal}
                onClick={() => onOpenModal(item.modal)}
                className="text-slate-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-slate-800/80 transition-colors cursor-pointer font-medium border border-transparent hover:border-slate-700"
              >
                {item.icon}
                <span>{language === 'hi' ? item.hi : item.en}</span>
              </button>
            ))}
            <span className="text-slate-700">|</span>
            {onOpenDatasetReplay && (
              <button
                onClick={onOpenDatasetReplay}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'hi' ? 'डेटा रिप्ले' : 'Replay Telemetry'}</span>
              </button>
            )}
            {onOpenMobileQR && (
              <button
                onClick={onOpenMobileQR}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer shadow-md shadow-cyan-600/20"
              >
                <Smartphone className="w-3.5 h-3.5 text-white" />
                <span>{language === 'hi' ? 'मोबाइल नोड (QR)' : 'Mobile Node (QR)'}</span>
              </button>
            )}
            <div className="px-3 py-1 bg-[#070d1e] border border-slate-800 rounded-lg text-right">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                {isLiveApiMode ? 'Live Weather Feed' : 'Telemetry Simulator'}
              </div>
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 justify-end font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active (0ms)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav aria-label="Portal Navigation" className="bg-[#070d1e] border-t border-b border-slate-800 text-white">
        <div className="max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between overflow-x-auto scrollbar-none py-1.5 text-xs font-semibold">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs touch-target ${
                pathname === '/'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'मुख्य पृष्ठ' : 'Overview'}</span>
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs touch-target ${
                pathname === '/dashboard'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'ऑपरेशन्स कंसोल' : 'Ops Console'}</span>
            </Link>
            <Link
              href="/mobile"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs touch-target ${
                pathname === '/mobile'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'मोबाइल नोड' : 'Mobile Node (Field)'}</span>
            </Link>
            <Link
              href="/audit-report"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs touch-target ${
                pathname === '/audit-report'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'ऑडिट रिपोर्ट' : 'Audit Report'}</span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-cyan-300 pl-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>WMO Pub 8 Anomaly Engine: Active</span>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-[#070d1e] border-b border-slate-800 p-4 space-y-3 animate-fadeIn">
          <div className="grid grid-cols-2 gap-2 text-xs font-bold pb-3 border-b border-slate-800">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-3 rounded-lg flex items-center gap-2 border touch-target ${
                pathname === '/' ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold' : 'bg-[#0e1730] text-slate-200 border-slate-800'
              }`}
            >
              <Home className="w-4 h-4 text-cyan-400" />
              <span>Overview</span>
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-3 rounded-lg flex items-center gap-2 border touch-target ${
                pathname === '/dashboard' ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold' : 'bg-[#0e1730] text-slate-200 border-slate-800'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Ops Console</span>
            </Link>
            <Link
              href="/mobile"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-3 rounded-lg flex items-center gap-2 border touch-target ${
                pathname === '/mobile' ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold' : 'bg-[#0e1730] text-slate-200 border-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Mobile Field Node</span>
            </Link>
            <Link
              href="/audit-report"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-3 rounded-lg flex items-center gap-2 border touch-target ${
                pathname === '/audit-report' ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold' : 'bg-[#0e1730] text-slate-200 border-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4 text-purple-400" />
              <span>Audit Dossier</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {([
              { modal: 'architecture' as const, icon: <Server className="w-4 h-4 text-cyan-400" />, label: 'Architecture' },
              { modal: 'methodology' as const, icon: <BookOpen className="w-4 h-4 text-sky-400" />, label: 'WMO Standards' },
              { modal: 'security' as const, icon: <Shield className="w-4 h-4 text-emerald-400" />, label: 'Zero-Trust' },
              { modal: 'provenance' as const, icon: <Layers className="w-4 h-4 text-purple-400" />, label: 'Data Engine' },
            ]).map((item) => (
              <button
                key={item.modal}
                onClick={() => { onOpenModal(item.modal); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 p-2.5 bg-[#0e1730] rounded-lg border border-slate-800 text-slate-200 font-medium hover:bg-slate-800 cursor-pointer touch-target"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            {onOpenDatasetReplay && (
              <button
                onClick={() => { onOpenDatasetReplay(); setIsMobileMenuOpen(false); }}
                className="flex-1 py-2.5 bg-[#0e1730] border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer touch-target"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Replay Telemetry</span>
              </button>
            )}
            {onOpenMobileQR && (
              <button
                onClick={() => { onOpenMobileQR(); setIsMobileMenuOpen(false); }}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer touch-target shadow-md"
              >
                <Smartphone className="w-4 h-4 text-white" />
                <span>Phone Node QR</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
});
