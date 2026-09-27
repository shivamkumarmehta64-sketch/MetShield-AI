'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const GovInstitutionalConsole = dynamic(
  () => import('@/components/GovInstitutionalConsole').then(mod => mod.GovInstitutionalConsole),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-96 flex items-center justify-center bg-[#0e1730]/95 border border-slate-800 rounded-xl animate-pulse">
        <span className="text-slate-400 text-sm font-semibold">Initializing NAWS-QMS Telemetry...</span>
      </div>
    ) 
  }
);

export default function Page() {
  const [fontSizeScale, setFontSizeScale] = useState<'sm' | 'md' | 'lg'>('md');
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const fontClass =
    fontSizeScale === 'sm' ? 'text-xs' : fontSizeScale === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className={`min-h-screen bg-[#070d1e] text-white flex flex-col font-sans transition-all duration-200 ${fontClass}`}>
      {/* Subtle 2px tricolor strip */}
      <div
        className="w-full h-[2px] flex shrink-0 sticky top-0 z-50"
        style={{
          background: 'linear-gradient(to right, #FF9933 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #138808 66.6%)',
        }}
      />
      
      {/* Header Bar */}
      <header className="border-b border-slate-800/90 bg-[#0b1329]/95 backdrop-blur sticky top-[2px] z-40 px-4 py-3 shadow-md">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                भारत सरकार | Ministry of Earth Sciences
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                PROJECT JATAYU — NAWS-QMS v4.2
              </h1>
            </div>
          </div>
          
          {/* GIGW accessibility controls (A-, A, A+, bilingual toggle) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 border-r border-slate-700 pr-3">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Ingestion: 2.5s DCP link active</span>
            </div>

            <div className="flex items-center border border-slate-700 rounded-md overflow-hidden bg-slate-900 text-xs">
              <button
                type="button"
                onClick={() => setFontSizeScale('sm')}
                className={`px-2 py-1 font-semibold hover:bg-slate-800 ${fontSizeScale === 'sm' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
              >A-</button>
              <button
                type="button"
                onClick={() => setFontSizeScale('md')}
                className={`px-2 py-1 font-semibold hover:bg-slate-800 ${fontSizeScale === 'md' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
              >A</button>
              <button
                type="button"
                onClick={() => setFontSizeScale('lg')}
                className={`px-2 py-1 font-semibold hover:bg-slate-800 ${fontSizeScale === 'lg' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
              >A+</button>
            </div>
            
            <button
              type="button"
              onClick={() => setLang(l => (l === 'en' ? 'hi' : 'en'))}
              className="text-xs px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-300 font-medium hover:border-slate-500 transition-colors"
            >
              {lang === 'en' ? 'हिन्दी' : 'EN'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 w-full max-w-[1720px] mx-auto">
        <GovInstitutionalConsole lang={lang} />
      </main>
    </div>
  );
}
