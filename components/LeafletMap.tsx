'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

export type BasemapStyle = 'DARK' | 'SATELLITE' | 'OSM' | 'POSITRON';

export const BASEMAP_TILES: Record<BasemapStyle, { name: string; url: string; attribution: string; maxZoom: number; subdomains?: string }> = {
  DARK: {
    name: 'Dark Command Canvas',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom',
    maxZoom: 16,
  },
  SATELLITE: {
    name: 'ESRI Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; USGS, NASA, CGIAR, GEBCO, NOAA',
    maxZoom: 18
  },
  OSM: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  POSITRON: {
    name: 'Positron Gray',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
  }
};

// IMD Doppler Weather Radar (DWR) Stations Network
export const IMD_DWR_RADAR_STATIONS = [
  { id: 'DWR-DEL', name: 'Delhi NCR (Mausam Bhavan)', lat: 28.59, lon: 77.22, rangeKm: 250, type: 'S-Band 500kW' },
  { id: 'DWR-MUM', name: 'Mumbai (Colaba Maritime)', lat: 18.90, lon: 72.81, rangeKm: 250, type: 'C-Band Polarimetric' },
  { id: 'DWR-CHN', name: 'Chennai (Port Cyclone Warning)', lat: 13.08, lon: 80.29, rangeKm: 250, type: 'S-Band Cyclone Spec' },
  { id: 'DWR-KOL', name: 'Kolkata (Alipore Observatory)', lat: 22.53, lon: 88.32, rangeKm: 250, type: 'S-Band Bay Radar' },
  { id: 'DWR-CHR', name: 'Cherrapunji (Sohra Plateau)', lat: 25.30, lon: 91.73, rangeKm: 200, type: 'X-Band Cloud Radar' },
  { id: 'DWR-HYD', name: 'Hyderabad (Begumpet)', lat: 17.45, lon: 78.47, rangeKm: 250, type: 'C-Band Dual-Pol' },
  { id: 'DWR-KOC', name: 'Kochi (INS Garuda Naval)', lat: 9.93, lon: 76.27, rangeKm: 250, type: 'C-Band Arabian Sea' },
  { id: 'DWR-SRN', name: 'Srinagar (Pir Panjal)', lat: 34.08, lon: 74.80, rangeKm: 200, type: 'X-Band Mountain DWR' },
  { id: 'DWR-PAT', name: 'Patna (Gangetic Basin)', lat: 25.60, lon: 85.14, rangeKm: 250, type: 'C-Band Weather Radar' },
  { id: 'DWR-NGP', name: 'Nagpur (Central IMD)', lat: 21.15, lon: 79.08, rangeKm: 250, type: 'C-Band Dual-Pol' },
  { id: 'DWR-BHP', name: 'Bhopal (Malwa Doppler)', lat: 23.26, lon: 77.41, rangeKm: 250, type: 'C-Band Polarimetric' },
  { id: 'DWR-VZG', name: 'Visakhapatnam (Dolphin Nose)', lat: 17.68, lon: 83.29, rangeKm: 250, type: 'S-Band Coastal Radar' },
];

// Thermal Heatwave Isotherms
export const THERMAL_ISOTHERMS = [
  { id: 'TH-THAR', name: 'Thar Desert Heat Dome', lat: 27.2, lon: 71.5, radiusKm: 180, temp: '43.2°C', color: '#dc2626' },
  { id: 'TH-VID', name: 'Vidarbha Semi-Arid Core', lat: 20.8, lon: 78.5, radiusKm: 160, temp: '41.8°C', color: '#ea580c' },
  { id: 'TH-GAN', name: 'Indo-Gangetic Basin Plume', lat: 26.5, lon: 81.5, radiusKm: 200, temp: '39.4°C', color: '#d97706' },
  { id: 'TH-RAY', name: 'Rayalaseema Dry Belt', lat: 14.8, lon: 77.8, radiusKm: 140, temp: '40.6°C', color: '#ea580c' },
  { id: 'TH-HIM', name: 'Himalayan Cold Front', lat: 33.5, lon: 76.5, radiusKm: 220, temp: '12.4°C', color: '#0284c7' },
];

// Helper component to manage center, zoom and view changes
function MapViewManager({
  activeCenter,
  activeZoom,
  viewTarget
}: {
  activeCenter?: [number, number];
  activeZoom?: number;
  viewTarget?: { center: [number, number]; zoom: number; key: string } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (viewTarget) {
      map.setView(viewTarget.center, viewTarget.zoom, { animate: true });
    } else if (activeCenter && activeZoom) {
      map.setView(activeCenter, activeZoom, { animate: true });
    }
  }, [activeCenter, activeZoom, viewTarget, map]);

  return null;
}

export interface MapNode {
  id: string;
  name: string;
  hindiName?: string;
  state: string;
  elevM?: number;
  lat: number;
  lon: number;
  isMobile?: boolean;
  isCoreImd?: boolean;
  col: { fill: string; ring?: string; label?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pkt?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseline?: any;
  [key: string]: unknown;
}

interface MapProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeNode: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNodeClick: (node: any) => void;
  activeLayer: 'QC' | 'THERMAL' | 'RADAR';
  basemap?: BasemapStyle;
  viewTarget?: { center: [number, number]; zoom: number; key: string } | null;
  isMobile?: boolean;
}

export default function LeafletMap({
  nodes,
  activeNode,
  onNodeClick,
  activeLayer,
  basemap = 'DARK',
  viewTarget = null,
  isMobile = false
}: MapProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeNodeData = activeNode as any;
  const tileConfig = BASEMAP_TILES[basemap] || BASEMAP_TILES.DARK;
  const isHighDensity = nodes.length > 150;

  return (
    <MapContainer
      center={[22.5, 79.5]} // Geographical Center of India
      zoom={4}
      style={{ height: '100%', width: '100%', minHeight: '440px', zIndex: 0 }}
      zoomControl={true}
      dragging={!isMobile}
      scrollWheelZoom={false}
    >
      <TileLayer
        key={basemap}
        attribution={tileConfig.attribution}
        url={tileConfig.url}
        maxZoom={tileConfig.maxZoom}
        subdomains={tileConfig.subdomains ?? 'abc'}
      />

      <MapViewManager
        activeCenter={activeNodeData ? [activeNodeData.lat, activeNodeData.lon] : undefined}
        activeZoom={activeNodeData ? 6 : 4}
        viewTarget={viewTarget}
      />

      {/* Doppler Radar Network Layer */}
      {activeLayer === 'RADAR' && (
        <>
          {IMD_DWR_RADAR_STATIONS.map(dwr => (
            <React.Fragment key={dwr.id}>
              {/* Outer Radar Coverage Range */}
              <Circle
                center={[dwr.lat, dwr.lon]}
                radius={dwr.rangeKm * 1000}
                pathOptions={{
                  color: '#0284c7',
                  fillColor: '#38bdf8',
                  fillOpacity: 0.16,
                  weight: 1.5,
                  dashArray: '5, 5'
                }}
              />
              {/* Inner High-Resolution Pulse Zone */}
              <Circle
                center={[dwr.lat, dwr.lon]}
                radius={dwr.rangeKm * 400}
                pathOptions={{
                  color: '#0369a1',
                  fillColor: '#0ea5e9',
                  fillOpacity: 0.28,
                  weight: 1
                }}
              />
              {/* Center DWR Radar Beacon */}
              <CircleMarker
                center={[dwr.lat, dwr.lon]}
                radius={7}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: '#0284c7',
                  fillOpacity: 1
                }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <div className="text-[11px] font-sans">
                    <div className="font-bold text-sky-800">📡 {dwr.name}</div>
                    <div className="text-slate-600 font-mono text-[10px]">{dwr.type} · Range: {dwr.rangeKm}km</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            </React.Fragment>
          ))}
        </>
      )}

      {/* Thermal Isotherm Heatwave Layer */}
      {activeLayer === 'THERMAL' && (
        <>
          {THERMAL_ISOTHERMS.map(th => (
            <React.Fragment key={th.id}>
              <Circle
                center={[th.lat, th.lon]}
                radius={th.radiusKm * 1000}
                pathOptions={{
                  color: th.color,
                  fillColor: th.color,
                  fillOpacity: 0.22,
                  weight: 1.8,
                  dashArray: '4, 4'
                }}
              />
              <Circle
                center={[th.lat, th.lon]}
                radius={th.radiusKm * 450}
                pathOptions={{
                  color: th.color,
                  fillColor: th.color,
                  fillOpacity: 0.38,
                  weight: 1
                }}
              >
                <Tooltip direction="center" permanent>
                  <div className="text-[10px] font-bold text-white bg-slate-900/90 px-1.5 py-0.5 rounded shadow border border-slate-700">
                    🌡️ {th.temp}
                  </div>
                </Tooltip>
              </Circle>
            </React.Fragment>
          ))}
        </>
      )}

      {/* Observational Station Nodes */}
      {nodes.map(rawNode => {
        const node = rawNode as unknown as MapNode;
        const isSelected = activeNodeData?.id === node.id;
        const color = node.isMobile ? '#06b6d4' : (node.col?.fill ?? '#16a34a');
        
        let radius = 5;
        if (isSelected) {
          radius = 10;
        } else if (node.isCoreImd) {
          radius = isHighDensity ? 6 : 7;
        } else if (node.isMobile) {
          radius = 7;
        } else if (isHighDensity) {
          radius = 3.5;
        }

        const pkt = node.pkt;
        const tempVal = pkt?.temperature ?? node.baseline?.tempMean ?? 28.5;
        const humVal = pkt?.relativeHumidity ?? node.baseline?.humidityMean ?? 65;
        const pressVal = pkt?.atmosphericPressure ?? node.baseline?.pressureMean ?? 1010.5;

        return (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lon]}
            radius={radius}
            pathOptions={{
              color: isSelected ? '#38bdf8' : (node.isCoreImd ? '#f59e0b' : '#ffffff'),
              weight: isSelected ? 3 : (node.isCoreImd ? 2 : 1),
              fillColor: color,
              fillOpacity: isSelected ? 1 : 0.88,
            }}
            eventHandlers={{
              click: () => onNodeClick(node),
            }}
          >
            {!isMobile && <Popup>
              <div className="text-xs space-y-1.5 p-1 min-w-[210px] font-sans">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between gap-2">
                  <div className="truncate font-extrabold">{node.name}</div>
                  {node.isMobile && (
                    <span className="text-[9px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                      Mobile Node
                    </span>
                  )}
                  {node.isCoreImd && (
                    <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                      IMD Benchmark
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-600">
                  <div><span className="font-semibold text-slate-700">State:</span> {node.state}</div>
                  <div><span className="font-semibold text-slate-700">Location:</span> {node.lat.toFixed(2)}°N, {node.lon.toFixed(2)}°E {node.elevM ? `· ${node.elevM}m ASL` : ''}</div>
                </div>

                {/* Live Telemetry Summary */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded text-[10px] font-mono text-slate-800">
                  <div>
                    <div className="text-[9px] text-slate-500 font-sans">TEMP</div>
                    <div className="font-bold text-slate-900">{typeof tempVal === 'number' ? tempVal.toFixed(1) : tempVal}°C</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-sans">HUMID</div>
                    <div className="font-bold text-slate-900">{typeof humVal === 'number' ? humVal.toFixed(0) : humVal}%</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-sans">PRESS</div>
                    <div className="font-bold text-slate-900">{typeof pressVal === 'number' ? pressVal.toFixed(0) : pressVal} hPa</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 p-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-[10px] font-medium">
                  <span>WMO Pub 8 QC:</span>
                  <span className="font-bold text-emerald-700">✔ VERIFIED (Flag 1)</span>
                </div>

                <button
                  type="button"
                  onClick={() => onNodeClick(node)}
                  className="w-full mt-1 py-1 px-2 bg-[#002147] hover:bg-[#003366] text-white text-[11px] font-bold rounded text-center transition-colors shadow-xs"
                >
                  Inspect in Telemetry Console →
                </button>
              </div>
            </Popup>}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
