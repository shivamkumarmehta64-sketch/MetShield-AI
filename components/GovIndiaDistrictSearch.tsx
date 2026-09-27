'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Sparkles, Loader2, Compass, ArrowRight } from 'lucide-react';
import { searchIndianDistricts, DistrictSearchResult, NOTABLE_INDIAN_EXTREMES, createDynamicStationProfile } from '@/lib/liveDistrictService';
import { IMDStationProfile } from '@/lib/stationData';
import { DISTRICT_REGISTRY_COUNTS } from '@/lib/dataProvenance';

interface Props {
  onSelectStationProfile: (profile: IMDStationProfile) => void;
  selectedStationId: string;
  language: 'hi' | 'en';
}

export const GovIndiaDistrictSearch = React.memo<Props>(function GovIndiaDistrictSearch({
  onSelectStationProfile,
  language,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DistrictSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      const res = await searchIndianDistricts(query);
      setResults(res);
      setIsLoading(false);
      setIsOpen(true);
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (district: DistrictSearchResult) => {
    const profile = createDynamicStationProfile(district);
    setSelectedLabel(`${district.name}, ${district.admin1 || 'India'}`);
    setIsOpen(false);
    setQuery('');
    onSelectStationProfile(profile);
  };

  const handlePresetSelect = (preset: typeof NOTABLE_INDIAN_EXTREMES[0]) => {
    const dummy: DistrictSearchResult = {
      id: Math.abs(Math.round(preset.lat * 1000)),
      name: preset.city,
      latitude: preset.lat,
      longitude: preset.lon,
      elevation: preset.elev,
      admin1: preset.state,
      country: 'India',
    };
    handleSelect(dummy);
  };

  return (
    <div ref={wrapperRef} className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-xl shadow-xl p-3 sm:p-4 space-y-2.5 relative text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-950 border border-sky-800/60 text-sky-400 shrink-0">
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <span>{language === 'hi' ? 'अखिल भारतीय जिला व शहर लाइव मौसम अन्वेषक' : 'All-India District & City Universal Ingestion'}</span>
              <span
                className="bg-sky-950 text-sky-400 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border border-sky-800/60"
                title={`${DISTRICT_REGISTRY_COUNTS.real} real district records, ${DISTRICT_REGISTRY_COUNTS.modified} with adjusted attributes, ${DISTRICT_REGISTRY_COUNTS.synthesized} synthesized placeholders. Only the first group is a faithful real-district registry.`}
              >
                {DISTRICT_REGISTRY_COUNTS.total} district records
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {language === 'hi'
                ? 'भारत के किसी भी शहर या जिले का नाम खोजें — वास्तविक समय खुला मौसम डेटा तुरंत उपलब्ध होगा'
                : 'Search any Indian city or district to dynamically provision an active AWS node with live weather telemetry'}
            </p>
          </div>
        </div>

        {selectedLabel && (
          <div className="text-xs bg-sky-950/80 border border-sky-700/60 text-sky-300 px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 self-start md:self-auto font-mono">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Active: <strong className="text-white">{selectedLabel}</strong></span>
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setIsOpen(true); }}
            placeholder={language === 'hi' ? 'किसी भी भारतीय शहर या जिले का नाम लिखें (उदा. वाराणसी, लेह, कोच्चि, चेरापूंजी)...' : 'Type any Indian district or city (e.g. Varanasi, Leh, Kochi, Cherrapunji, Dwarka)...'}
            className="w-full bg-slate-950/90 hover:bg-slate-950 focus:bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition-all font-medium"
          />
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-sky-400 animate-spin absolute right-3" />
          ) : query ? (
            <button
              onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
              className="text-slate-500 hover:text-slate-300 text-xs absolute right-3 font-bold cursor-pointer p-1"
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Autocomplete Dropdown */}
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-800/80 animate-fadeIn backdrop-blur-xl">
            {results.map((r) => (
              <button
                key={`${r.id}-${r.latitude}`}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-900 flex items-center justify-between text-xs transition-colors cursor-pointer group text-slate-200"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-white">{r.name}</span>
                    <span className="text-slate-400 ml-1.5 text-[11px]">{r.admin1 ? `· ${r.admin1}` : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                  <span>{r.latitude}°N, {r.longitude}°E</span>
                  <span>({r.elevation}m)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preset Climatic Extremes Chips - Touch-friendly swipeable row on mobile */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{language === 'hi' ? 'त्वरित भारतीय जलवायु चरम सीमाएं:' : '1-Tap Extreme Climatic Observatories:'}</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap scrollbar-none">
          {NOTABLE_INDIAN_EXTREMES.map((preset) => (
            <button
              key={preset.city}
              onClick={() => handlePresetSelect(preset)}
              title={`${preset.note} (${preset.elev}m MSL)`}
              className="px-2.5 py-1 bg-slate-950/80 hover:bg-sky-950 hover:border-sky-500/50 border border-slate-800 rounded-lg text-[10px] font-medium text-slate-300 hover:text-sky-200 transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span className="font-semibold">{preset.city}</span>
              <span className="text-[9px] text-slate-500">({preset.state})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
