'use client';

import React, { useState, useMemo } from 'react';
import { useAllDistricts, prioritizeStateDistricts } from '@/lib/districtEngine';
import { evaluateIMDHeatwave } from '@/lib/heatwaveEngine';
import { DISTRICT_REGISTRY_COUNTS } from '@/lib/dataProvenance';
import { BasemapStyle } from './LeafletMap';
import {
  MapPin,
  Filter,
  Search,
  Flame,
  ShieldCheck,
  Globe2,
  Layers,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const DynamicVayuLeafletMap = dynamic(() => import('./VayuLeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[520px] flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2">
      <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono">Loading Interactive 766-District GIS Map...</span>
    </div>
  )
});

interface Props {
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
  language?: 'en' | 'hi';
}

export const VayuDistrictMap: React.FC<Props> = ({
  selectedDistrictId,
  onSelectDistrict,
  language = 'en'
}) => {
  const allDistrictEntries = useAllDistricts();
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMapLayer, setActiveMapLayer] = useState<'QC' | 'HEATWAVE'>('QC');
  const [activeBasemap, setActiveBasemap] = useState<BasemapStyle>('DARK');

  // Compute list of unique states
  const statesList = useMemo(() => {
    const set = new Set<string>();
    for (const d of allDistrictEntries) {
      if (d.district?.state) set.add(d.district.state);
    }
    return Array.from(set).sort();
  }, [allDistrictEntries]);

  // Handle state filter zoom
  const handleSelectState = (st: string) => {
    setSelectedState(st);
    if (st !== 'ALL') {
      prioritizeStateDistricts(st);
    }
  };

  // Compute health counts
  const statusCounts = useMemo(() => {
    const counts = { HEALTHY: 0, DEGRADED: 0, CRITICAL: 0, OFFLINE: 0, LOADING: 0 };
    for (const d of allDistrictEntries) {
      if (counts[d.health] !== undefined) {
        counts[d.health]++;
      }
    }
    return counts;
  }, [allDistrictEntries]);

  // Compute Heatwave counts
  const heatwaveCounts = useMemo(() => {
    const counts = { normal: 0, yellow: 0, orange: 0, red: 0 };
    for (const d of allDistrictEntries) {
      const hw = evaluateIMDHeatwave(d.district, d.reading, d.history);
      if (hw.warningLevel === 'WARNING_SEVERE') counts.red++;
      else if (hw.warningLevel === 'ALERT') counts.orange++;
      else if (hw.warningLevel === 'WATCH') counts.yellow++;
      else counts.normal++;
    }
    return counts;
  }, [allDistrictEntries]);

  // Filter districts based on state & search query
  const displayedDistricts = useMemo(() => {
    let list = allDistrictEntries;

    if (selectedState !== 'ALL') {
      list = list.filter(d => d.district.state.toLowerCase() === selectedState.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(d =>
        d.district.name.toLowerCase().includes(q) ||
        d.district.state.toLowerCase().includes(q) ||
        d.district.id.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allDistrictEntries, selectedState, searchQuery]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="bg-slate-900/90 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl"
    >
      {/* Top Map Header */}
      <div className="bg-slate-950/95 border-b border-slate-800 p-3.5 space-y-3">
        {/* Title & Quick Search */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="p-2 bg-gradient-to-br from-indigo-500 to-sky-600 text-white rounded-lg shadow-md shadow-indigo-500/20"
            >
              <MapPin className="w-4 h-4" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  {language === 'hi' ? 'अखिल भारतीय 766 जिला स्वास्थ्य जीआईएस मानचित्र' : 'National 766 District Health GIS Map'}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {DISTRICT_REGISTRY_COUNTS.total} DISTRICT RECORDS INDEXED
                </span>
                <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[9px] font-mono px-1.5 py-0.5 rounded">
                  {activeBasemap} BASEMAP
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                WMO Pub 8 Quality Control Grid &amp; IMD Heatwave Decision Support System · All 28 States &amp; 8 UTs
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search districts (e.g. Pune, Leh)..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900 text-white placeholder:text-slate-500 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Controls Row: Basemap Switcher, Layer Toggles, and State Filter */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800 text-xs">
          {/* Basemap Selection */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 px-1.5 font-bold uppercase tracking-wider flex items-center gap-1">
              <Globe2 className="w-3 h-3 text-sky-400" /> Basemap:
            </span>
            {(
              [
                { id: 'DARK', label: '🌑 Dark' },
                { id: 'SATELLITE', label: '🛰️ Satellite' },
                { id: 'OSM', label: '🗺️ OSM' },
                { id: 'POSITRON', label: '🏙️ Clean' }
              ] as { id: BasemapStyle; label: string }[]
            ).map(b => (
              <button
                key={b.id}
                onClick={() => setActiveBasemap(b.id)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  activeBasemap === b.id
                    ? 'bg-sky-500 text-white shadow-xs font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Layer Selector: WMO QC vs IMD Heatwave DSS */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 px-1.5 font-bold uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" /> Layer:
            </span>
            <button
              onClick={() => setActiveMapLayer('QC')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                activeMapLayer === 'QC' ? 'bg-emerald-600 text-white shadow-xs scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              <span>WMO Sensor QC</span>
            </button>
            <button
              onClick={() => setActiveMapLayer('HEATWAVE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                activeMapLayer === 'HEATWAVE' ? 'bg-amber-600 text-white shadow-xs scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-300" />
              <span>IMD Heatwave DSS</span>
            </button>
          </div>

          {/* State Zoom Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] text-slate-300 font-medium">State Zoom:</span>
            <select
              value={selectedState}
              onChange={e => handleSelectState(e.target.value)}
              className="bg-slate-950 text-white text-xs border border-slate-700 rounded px-2 py-0.5 focus:outline-none focus:border-sky-400"
            >
              <option value="ALL">All India (All 36 States &amp; UTs)</option>
              {statesList.map(st => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Health / Alert Status Counts */}
        <div className="flex items-center gap-3 flex-wrap text-xs pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
            {activeMapLayer === 'HEATWAVE' ? 'Heatwave Levels:' : 'QC Flag Integrity:'}
          </span>
          {activeMapLayer === 'HEATWAVE' ? (
            <>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/50" />
                <span className="text-white font-bold">{heatwaveCounts.normal}</span>
                <span className="text-slate-400">Normal</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block shadow-xs shadow-yellow-400/50" />
                <span className="text-white font-bold">{heatwaveCounts.yellow}</span>
                <span className="text-slate-400">Watch</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shadow-xs shadow-orange-500/50" />
                <span className="text-white font-bold">{heatwaveCounts.orange}</span>
                <span className="text-slate-400">Alert</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse shadow-xs shadow-red-500/50" />
                <span className="text-white font-bold">{heatwaveCounts.red}</span>
                <span className="text-slate-400">Severe</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs shadow-emerald-500/50" />
                <span className="text-white font-bold">{statusCounts.HEALTHY}</span>
                <span className="text-slate-400">Healthy</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs shadow-amber-500/50" />
                <span className="text-white font-bold">{statusCounts.DEGRADED}</span>
                <span className="text-slate-400">Degraded</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-xs shadow-red-500/50" />
                <span className="text-white font-bold">{statusCounts.CRITICAL}</span>
                <span className="text-slate-400">Critical</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-xs shadow-blue-500/50" />
                <span className="text-white font-bold">{statusCounts.LOADING}</span>
                <span className="text-slate-400">Loading</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block shadow-xs shadow-slate-500/50" />
                <span className="text-white font-bold">{statusCounts.OFFLINE}</span>
                <span className="text-slate-400">Offline</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Map Canvas Area - Real Leaflet GIS Map */}
      <div className="relative bg-slate-950 p-1 sm:p-2 flex-1 min-h-[520px] h-[65vh] lg:h-[760px]">
        {/* Floating Top Badge */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-lg shadow-lg text-[11px] font-mono text-slate-200">
            <span className="font-bold text-sky-400">{displayedDistricts.length}</span> Districts Plotted
          </div>
        </div>

        {/* Dynamic Leaflet Interactive Map */}
        <div className="w-full h-full min-h-[520px] h-[65vh] lg:h-[760px] rounded-lg overflow-hidden border border-slate-800 shadow-inner">
          <DynamicVayuLeafletMap
            districts={displayedDistricts}
            selectedDistrictId={selectedDistrictId}
            onSelectDistrict={onSelectDistrict}
            activeLayer={activeMapLayer}
            basemap={activeBasemap}
            selectedState={selectedState}
          />
        </div>
      </div>
    </motion.div>
  );
};
