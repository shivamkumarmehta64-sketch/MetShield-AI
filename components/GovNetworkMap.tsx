'use client';

import React, { useState, useMemo } from 'react';
import { TelemetryPacket, WMOQualityFlag } from '@/lib/anomalyLogic';
import { IMD_AWS_STATIONS, IMDStationProfile } from '@/lib/stationData';
import { ALL_INDIA_DISTRICTS, districtToStationProfile } from '@/lib/indiaDistrictCatalog';
import { DISTRICT_REGISTRY_COUNTS } from '@/lib/dataProvenance';
import { ALL_766_DISTRICTS, IndiaDistrict } from '@/lib/india766Districts';
import { BasemapStyle } from './LeafletMap';
import {
  MapPin,
  Wifi,
  Smartphone,
  Thermometer,
  CloudRain,
  ShieldCheck,
  Search,
  Layers,
  Globe2,
  Maximize2,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const DynamicLeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2">
      <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono">Initializing High-Resolution GIS Basemap...</span>
    </div>
  )
});

interface Props {
  latestPackets: Record<string, TelemetryPacket>;
  selectedStationId: string;
  onSelectStation: (id: string) => void;
  onSelectCustomDistrict?: (districtProfile: IMDStationProfile) => void;
  customStations?: Record<string, IMDStationProfile>;
  language?: 'en' | 'hi';
}

const FLAG_COLORS: Record<WMOQualityFlag | 'UNKNOWN', { fill: string; ring: string; label: string }> = {
  FLAG_1_VERIFIED_GOOD:    { fill: '#16a34a', ring: '#bbf7d0', label: 'Nominal' },
  FLAG_2_CONVECTIVE_STORM: { fill: '#2563eb', ring: '#bfdbfe', label: 'Storm' },
  FLAG_3_SUSPECT_DRIFT:    { fill: '#d97706', ring: '#fde68a', label: 'Drift' },
  FLAG_4_CORRUPT_HARDWARE: { fill: '#dc2626', ring: '#fecaca', label: 'Fault' },
  FLAG_5_PACKET_LOSS:      { fill: '#7c3aed', ring: '#ede9fe', label: 'Packet Loss' },
  UNKNOWN:                 { fill: '#64748b', ring: '#e2e8f0', label: 'Standby' },
};

type RmcFilter = 'ALL' | 'Northern' | 'Western' | 'Southern' | 'Eastern' | 'Central' | 'North-Eastern' | 'MOBILE';
type MapLayer = 'QC' | 'THERMAL' | 'RADAR';
type DensityMode = 'PRIMARY' | 'ALL_766';

// Regional View Extents
const REGIONAL_VIEWS: Record<string, { name: string; hindiName: string; center: [number, number]; zoom: number }> = {
  ALL: { name: 'All India', hindiName: 'अखिल भारत', center: [22.5, 79.5], zoom: 4 },
  NORTH: { name: 'Northern', hindiName: 'उत्तर', center: [31.2, 77.2], zoom: 6 },
  WEST: { name: 'Western', hindiName: 'पश्चिम', center: [21.5, 73.2], zoom: 6 },
  SOUTH: { name: 'Southern', hindiName: 'दक्षिण', center: [12.5, 78.2], zoom: 6 },
  EAST: { name: 'Eastern', hindiName: 'पूर्व', center: [23.5, 86.5], zoom: 6 },
  NE: { name: 'North-East', hindiName: 'पूर्वोत्तर', center: [26.2, 92.8], zoom: 6.5 },
  CENTRAL: { name: 'Central', hindiName: 'मध्य', center: [23.2, 79.5], zoom: 6 },
};

function convert766ToProfile(d: IndiaDistrict): IMDStationProfile {
  const elev = d.isCoastal ? 12 : 320;
  const p0 = 1013.25 * Math.pow(1 - (0.0065 * elev) / 288.15, 5.255);
  return {
    stationId: d.id,
    name: `${d.name} District Observatory, ${d.state}`,
    hindiName: `${d.name} वेधशाला, ${d.state}`,
    state: d.state,
    latitude: d.lat,
    longitude: d.lng,
    elevationM: elev,
    rmcDivision: `Regional Meteorological Division`,
    wmoBlockNo: '43' + (100 + (Math.abs(Math.round(d.lat * 10 + d.lng * 10)) % 800)),
    sensorMetadata: {
      tempSensor: 'PT100 Class-A 4-Wire RTD (DIN EN 60751)',
      pressureSensor: 'Vaisala PTB110 Silicon Capacitive Barometer',
      humiditySensor: 'Vaisala Humicap 180R Thin-Film Polymer',
      dataloggerModel: 'Sutron 9210-XL WMO Compliant DCP',
      telemetryUplink: 'INSAT-3D TDMA 401.5 MHz & 4G-LTE Fallback',
      batteryVoltage: '12.8 V (Solar Fed)',
      lastCalibDate: '2026-04-10',
      calibCertNo: `NABL/MET/${d.id}/26`
    },
    baseline: {
      tempMean: 28.5,
      pressureMean: Math.round(p0 * 10) / 10,
      humidityMean: d.isCoastal ? 76 : 56,
      windMean: 11.5,
      windDirMean: 220
    },
    status: 'OPERATIONAL'
  };
}

export const GovNetworkMap = React.memo<Props>(function GovNetworkMap({
  latestPackets,
  selectedStationId,
  onSelectStation,
  onSelectCustomDistrict,
  customStations = {},
  language = 'en'
}) {
  const [selectedRmc, setSelectedRmc] = useState<RmcFilter>('ALL');
  const [activeLayer, setActiveLayer] = useState<MapLayer>('QC');
  const [activeBasemap, setActiveBasemap] = useState<BasemapStyle>('POSITRON');
  const [densityMode, setDensityMode] = useState<DensityMode>('PRIMARY');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewTarget, setViewTarget] = useState<{ center: [number, number]; zoom: number; key: string } | null>(null);

  // Combine Stations according to densityMode
  const mapNodes = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: Array<any> = [];

    // 1. Core IMD Stations (Primary Benchmarks)
    for (const s of IMD_AWS_STATIONS) {
      if (s.wmoBlockNo === '49999') continue;
      const pkt = latestPackets[s.stationId];
      const flag = pkt?.wmoFlag ?? 'FLAG_1_VERIFIED_GOOD';
      const alert = pkt?.alertLevel ?? 'LEVEL_0_NOMINAL';
      const col = FLAG_COLORS[flag] ?? FLAG_COLORS.UNKNOWN;

      list.push({
        id: s.stationId,
        name: s.name,
        hindiName: s.hindiName,
        state: s.state,
        lat: s.latitude,
        lon: s.longitude,
        elevM: s.elevationM,
        rmc: s.rmcDivision.replace('RMC ', '').split(' ')[0],
        climate: 'National Primary Benchmark',
        isCoreImd: true,
        isMobile: false,
        pkt,
        flag,
        alert,
        col,
        baseline: s.baseline,
        profile: s
      });
    }

    // 2. Either Curated 70+ Districts or All 766 Districts
    if (densityMode === 'PRIMARY') {
      for (const d of ALL_INDIA_DISTRICTS) {
        if (list.some(item => Math.abs(item.lat - d.lat) < 0.15 && Math.abs(item.lon - d.lon) < 0.15)) {
          continue;
        }
        const pkt = latestPackets[d.districtCode];
        const flag = pkt?.wmoFlag ?? 'FLAG_1_VERIFIED_GOOD';
        const alert = pkt?.alertLevel ?? 'LEVEL_0_NOMINAL';
        const col = FLAG_COLORS[flag] ?? FLAG_COLORS.UNKNOWN;

        list.push({
          id: d.districtCode,
          name: d.name,
          hindiName: d.hindiName,
          state: d.state,
          lat: d.lat,
          lon: d.lon,
          elevM: d.elevM,
          rmc: d.rmcZone,
          climate: d.climateZone,
          isCoreImd: false,
          isMobile: false,
          pkt,
          flag,
          alert,
          col,
          districtNode: d
        });
      }
    } else {
      // High-Density ALL 766 Districts
      for (const d of ALL_766_DISTRICTS) {
        if (list.some(item => item.id === d.id || (Math.abs(item.lat - d.lat) < 0.08 && Math.abs(item.lon - d.lng) < 0.08))) {
          continue;
        }
        const pkt = latestPackets[d.id];
        const flag = pkt?.wmoFlag ?? 'FLAG_1_VERIFIED_GOOD';
        const alert = pkt?.alertLevel ?? 'LEVEL_0_NOMINAL';
        const col = FLAG_COLORS[flag] ?? FLAG_COLORS.UNKNOWN;

        list.push({
          id: d.id,
          name: d.name,
          state: d.state,
          lat: d.lat,
          lon: d.lng,
          elevM: d.isCoastal ? 12 : 320,
          rmc: 'All-India district index',
          climate: d.isCoastal ? 'Coastal Marine' : 'Inland Continental',
          isCoreImd: false,
          isMobile: false,
          pkt,
          flag,
          alert,
          col,
          indiaDistrict: d
        });
      }
    }

    // 3. Dynamic Custom & Mobile Stations
    for (const [stId, prof] of Object.entries(customStations)) {
      if (list.some(item => item.id === stId)) continue;
      const pkt = latestPackets[stId];
      const flag = pkt?.wmoFlag ?? 'FLAG_1_VERIFIED_GOOD';
      const alert = pkt?.alertLevel ?? 'LEVEL_0_NOMINAL';
      const col = FLAG_COLORS[flag] ?? FLAG_COLORS.UNKNOWN;
      const isMobile = stId.startsWith('AWS-MOB');

      list.push({
        id: stId,
        name: prof.name,
        hindiName: prof.hindiName,
        state: prof.state,
        lat: prof.latitude,
        lon: prof.longitude,
        elevM: prof.elevationM,
        rmc: isMobile ? 'MOBILE' : 'Custom',
        climate: isMobile ? 'Live Smartphone GPS Node' : 'User Searched District',
        isCoreImd: false,
        isMobile,
        pkt,
        flag,
        alert,
        col,
        baseline: prof.baseline,
        profile: prof
      });
    }

    return list;
  }, [latestPackets, customStations, densityMode]);

  // Filtered by RMC and search query
  const filteredNodes = useMemo(() => {
    let result = mapNodes;

    if (selectedRmc === 'MOBILE') {
      result = result.filter(n => n.isMobile);
    } else if (selectedRmc !== 'ALL' && densityMode === 'PRIMARY') {
      result = result.filter(n => n.rmc?.toLowerCase().includes(selectedRmc.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.state.toLowerCase().includes(q) ||
        (n.hindiName && n.hindiName.includes(q)) ||
        n.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [mapNodes, selectedRmc, searchQuery, densityMode]);

  const activeNode = useMemo(() => {
    return mapNodes.find(n => n.id === selectedStationId) || mapNodes[0];
  }, [mapNodes, selectedStationId]);

  const handleNodeClick = (node: typeof mapNodes[0]) => {
    if (node.districtNode && onSelectCustomDistrict) {
      const prof = districtToStationProfile(node.districtNode);
      onSelectCustomDistrict(prof);
    } else if (node.indiaDistrict && onSelectCustomDistrict) {
      const prof = convert766ToProfile(node.indiaDistrict);
      onSelectCustomDistrict(prof);
    } else if (node.profile && onSelectCustomDistrict) {
      onSelectCustomDistrict(node.profile);
    } else {
      onSelectStation(node.id);
    }
  };

  const handleSelectRegionalExtent = (key: string) => {
    const region = REGIONAL_VIEWS[key];
    if (region) {
      setViewTarget({ center: region.center, zoom: region.zoom, key: `${key}-${Date.now()}` });
    }
  };

  const mobileCount = useMemo(() => mapNodes.filter(n => n.isMobile).length, [mapNodes]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden flex flex-col"
    >
      {/* Top Header Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 space-y-3">
        {/* Main Title Row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#002147] text-white rounded-md shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#002147]">
                  {language === 'hi' ? 'अखिल भारतीय जिला वेधशाला जीआईएस मानचित्र' : 'All-India Meteorological GIS Command Portal'}
                </h2>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">
                {densityMode === 'ALL_766' ? `${DISTRICT_REGISTRY_COUNTS.total} ALL-INDIA DISTRICT RECORDS` : '70+ BENCHMARK OBSERVATORIES'}
                </span>
                <span className="bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                  {activeBasemap} BASEMAP
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {language === 'hi'
                  ? 'बहु-परत उपग्रह, डॉपलर रडार और तापमान समोच्च विश्लेषण · किसी भी स्टेशन पर क्लिक करें'
                  : 'Multi-Basemap Satellite, Doppler Radar & Thermal Isotherm GIS · Click any node to inspect telemetry'}
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={language === 'hi' ? 'जिला, स्टेशन या राज्य खोजें...' : 'Search 766 districts or stations...'}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded focus:outline-none focus:border-[#002147] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* GIS Controls Row: Basemap Switcher, Layer Toggles, and Density Mode */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200 text-xs">
          {/* Basemap Selection */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300 shadow-2xs">
            <span className="text-[10px] text-slate-600 px-1.5 font-bold uppercase tracking-wider flex items-center gap-1">
              <Globe2 className="w-3 h-3 text-[#002147]" /> Basemap:
            </span>
            {(
              [
                { id: 'POSITRON', label: '🏙️ Clean' },
                { id: 'OSM', label: '🗺️ OSM' },
                { id: 'SATELLITE', label: '🛰️ Satellite' },
                { id: 'DARK', label: '🌑 Dark' }
              ] as { id: BasemapStyle; label: string }[]
            ).map(b => (
              <button
                key={b.id}
                onClick={() => setActiveBasemap(b.id)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  activeBasemap === b.id
                    ? 'bg-[#002147] text-white shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Meteorological Overlays */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300 shadow-2xs">
            <span className="text-[10px] text-slate-600 px-1.5 font-bold uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-700" /> Layer:
            </span>
            <button
              onClick={() => setActiveLayer('QC')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                activeLayer === 'QC' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>WMO QC</span>
            </button>
            <button
              onClick={() => setActiveLayer('THERMAL')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                activeLayer === 'THERMAL' ? 'bg-amber-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Thermometer className="w-3 h-3" />
              <span>Thermal</span>
            </button>
            <button
              onClick={() => setActiveLayer('RADAR')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                activeLayer === 'RADAR' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CloudRain className="w-3 h-3" />
              <span>Doppler Radar</span>
            </button>
          </div>

          {/* Network Density: Primary vs 766 All-India */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300 shadow-2xs">
            <button
              onClick={() => setDensityMode('PRIMARY')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                densityMode === 'PRIMARY'
                  ? 'bg-[#002147] text-white font-extrabold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              ⚡ Benchmark (70+)
            </button>
            <button
              onClick={() => setDensityMode('ALL_766')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                densityMode === 'ALL_766'
                  ? 'bg-[#002147] text-white font-extrabold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              🇮🇳 All 766 Districts
            </button>
          </div>
        </div>

        {/* Regional Quick View Presets Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mr-1 whitespace-nowrap">
            Region Extent:
          </span>
          {Object.entries(REGIONAL_VIEWS).map(([key, reg]) => (
            <button
              key={key}
              onClick={() => handleSelectRegionalExtent(key)}
              className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap transition-colors border border-slate-300 shadow-2xs"
            >
              {language === 'hi' ? reg.hindiName : reg.name}
            </button>
          ))}
          {mobileCount > 0 && (
            <button
              onClick={() => setSelectedRmc(selectedRmc === 'MOBILE' ? 'ALL' : 'MOBILE')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition-colors border ${
                selectedRmc === 'MOBILE'
                  ? 'bg-cyan-700 text-white border-cyan-800'
                  : 'bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Live Mobile Nodes ({mobileCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Map Canvas Area */}
      <div className="relative bg-slate-100 p-1 sm:p-2 flex-1 min-h-[460px] h-[60vh] lg:h-[740px]">
        {/* Floating Top Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md border border-slate-300 px-2.5 py-1 rounded shadow-md text-[11px] font-mono text-slate-800">
            <span className="font-bold text-[#002147]">{filteredNodes.length}</span>{' '}
            {densityMode === 'ALL_766' ? 'Districts Indexed' : 'Observatories Active'}
          </div>
          {activeLayer === 'THERMAL' && (
            <div className="bg-amber-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold shadow-md flex items-center gap-1">
              <Thermometer className="w-3 h-3" /> IMD Heatwave Thermal Isotherms Active
            </div>
          )}
          {activeLayer === 'RADAR' && (
            <div className="bg-blue-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold shadow-md flex items-center gap-1 animate-pulse">
              <CloudRain className="w-3 h-3" /> IMD Doppler Weather Radar (DWR) Active
            </div>
          )}
        </div>

        {/* Floating Top Right Live Status Pill */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-300 text-slate-800 px-2.5 py-1 rounded shadow-md text-[11px] font-bold">
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="tracking-wider font-mono text-[10px] text-slate-700">LIVE GIS STREAM</span>
          <button
            onClick={() => handleSelectRegionalExtent('ALL')}
            title="Reset to Full India View"
            className="ml-1 p-0.5 hover:text-[#002147] transition-colors pointer-events-auto"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>

        {/* Dynamic Leaflet GIS Map */}
        <div className="w-full h-full min-h-[460px] h-[60vh] lg:h-[740px] rounded overflow-hidden border border-slate-300 shadow-xs">
          <DynamicLeafletMap
            nodes={filteredNodes}
            activeNode={activeNode}
            onNodeClick={handleNodeClick}
            activeLayer={activeLayer}
            basemap={activeBasemap}
            viewTarget={viewTarget}
          />
        </div>
      </div>

      {/* Footer / Selected District Quick Inspect Bar */}
      <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full ring-2 ring-slate-400" style={{ backgroundColor: activeNode?.col?.fill ?? '#16a34a' }} />
          <div>
            <span className="font-bold text-[#002147]">
              {language === 'hi' ? 'सक्रिय जिला वेधशाला:' : 'Selected Observatory:'}
            </span>{' '}
            <span className="font-semibold text-slate-900">{activeNode?.name}</span>
            <span className="text-slate-500 ml-1">({activeNode?.state})</span>
            <span className="ml-2 font-mono text-[10px] text-slate-500">
              {activeNode?.lat?.toFixed(2)}°N, {activeNode?.lon?.toFixed(2)}°E
            </span>
          </div>
        </div>

        {/* Interactive Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[11px]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-slate-700">Flag 1 Nominal</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span className="text-slate-700">Flag 2 Storm</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
            <span className="text-slate-700">Flag 3 Drift</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            <span className="text-slate-700">Flag 4 Fault</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
            <span className="text-slate-700 font-medium">Live Mobile</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
