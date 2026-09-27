'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface StationMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  temp: number;
  pressure: number;
  rh: number;
  qc: 'NOMINAL' | 'FLAGGED' | 'QUARANTINED' | 'OFFLINE';
}

const MARKER_STATIONS: StationMarker[] = [
  { id: 'AWS-DEL-01', name: 'New Delhi Safdarjung', lat: 28.5865, lng: 77.2069, temp: 32.4, pressure: 1008.2, rh: 58.0, qc: 'NOMINAL' },
  { id: 'AWS-MUM-04', name: 'Mumbai Santacruz', lat: 19.0996, lng: 72.8608, temp: 31.8, pressure: 1009.5, rh: 72.3, qc: 'NOMINAL' },
  { id: 'AWS-CCU-02', name: 'Kolkata Alipore', lat: 22.5396, lng: 88.3507, temp: 33.1, pressure: 1007.8, rh: 65.4, qc: 'FLAGGED' },
  { id: 'AWS-MAA-03', name: 'Chennai Nungambakkam', lat: 13.0596, lng: 80.2486, temp: 34.2, pressure: 1006.9, rh: 61.2, qc: 'NOMINAL' },
  { id: 'AWS-BLR-05', name: 'Bengaluru Hebbal', lat: 13.0471, lng: 77.5946, temp: 29.6, pressure: 1010.3, rh: 55.8, qc: 'NOMINAL' },
  { id: 'AWS-HYD-06', name: 'Hyderabad Begumpet', lat: 17.4435, lng: 78.4747, temp: 33.8, pressure: 1008.7, rh: 52.1, qc: 'QUARANTINED' },
  { id: 'AWS-AMD-07', name: 'Ahmedabad Airport', lat: 23.0840, lng: 72.6458, temp: 35.1, pressure: 1007.2, rh: 48.6, qc: 'NOMINAL' },
  { id: 'AWS-PNQ-08', name: 'Pune Airport', lat: 18.5822, lng: 73.9197, temp: 30.9, pressure: 1009.8, rh: 60.4, qc: 'NOMINAL' },
  { id: 'AWS-JAI-09', name: 'Jaipur Airport', lat: 26.8267, lng: 75.8089, temp: 36.2, pressure: 1006.5, rh: 42.3, qc: 'FLAGGED' },
  { id: 'AWS-GAU-13', name: 'Guwahati Airport', lat: 26.1061, lng: 91.5859, temp: 31.2, pressure: 1009.1, rh: 78.5, qc: 'NOMINAL' },
];

const QC_COLORS: Record<string, { bg: string; border: string }> = {
  NOMINAL:     { bg: '#1A7A1A', border: '#0D4D0D' },
  FLAGGED:     { bg: '#7A5A00', border: '#3D2D00' },
  QUARANTINED: { bg: '#C0162C', border: '#7A0A15' },
  OFFLINE:     { bg: '#1E1E1E', border: '#2A2A2A' },
};

function createSquareIcon(qc: string): L.DivIcon {
  const colors = QC_COLORS[qc] || QC_COLORS.OFFLINE;
  const isQuarantined = qc === 'QUARANTINED';
  return L.divIcon({
    className: 'custom-station-marker',
    html: `<div style="width:8px;height:8px;background:${colors.bg};border:1px solid ${colors.border};${isQuarantined ? 'animation: mpiPulse 1.5s ease-in-out infinite;' : ''}"></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}

export default function LeafletMap() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [22.5, 79.5],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    MARKER_STATIONS.forEach((s) => {
      const icon = createSquareIcon(s.qc);
      const marker = L.marker([s.lat, s.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:var(--font-mono);">
          <div style="font-size:12px;font-weight:600;color:#FFFFFF;">${s.id}</div>
          <div style="font-size:10px;color:#7A7A7A;margin-top:2px;">${s.name}</div>
          <div style="font-size:10px;color:#9A9A9A;margin-top:4px;">T: ${s.temp.toFixed(1)}° · P: ${s.pressure.toFixed(0)}hPa · RH: ${s.rh.toFixed(0)}%</div>
          <div style="margin-top:6px;"><span style="font-size:10px;font-family:var(--font-mono);font-weight:500;letter-spacing:0.06em;padding:2px 7px;background:${QC_COLORS[s.qc].bg};color:${s.qc === 'NOMINAL' ? '#1DB31D' : s.qc === 'FLAGGED' ? '#CCA300' : s.qc === 'QUARANTINED' ? '#C0162C' : '#3D3D3D'};border:1px solid ${QC_COLORS[s.qc].border};">${s.qc}</span></div>
        </div>
      `, {
        closeButton: false,
        className: 'station-popup',
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        height: 380,
        border: '1px solid #1E1E1E',
        borderRadius: 0,
        background: '#0A0A0A',
      }}
    />
  );
}
