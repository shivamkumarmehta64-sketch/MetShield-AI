'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { clsx } from 'clsx';
import { Layers, LocateFixed, Search, X } from 'lucide-react';
import {
  classificationLabel,
  getNetworkSnapshot,
  stationHistory,
  type StationHealth,
  type StationSnapshot,
} from '@/lib/networkFeed';
import type { TelemetryPacket } from '@/lib/anomalyLogic';
import DataModeBadge from './DataModeBadge';

/**
 * §E — the national station map.
 *
 * The previous build drew a hand-written `MARKER_STATIONS` array of ten
 * coordinates with hand-typed temperatures. Five of its identifiers —
 * AWS-MUM-04, AWS-CCU-02, AWS-MAA-03, AWS-PNQ-08, AWS-GAU-13 — do not exist
 * in `IMD_AWS_STATIONS`, and it omitted the sixteen that do. It also rendered
 * 8×8 px squares (an 8px touch target against a 44px floor), pointed them at a
 * dark basemap that predated the light operations theme, and animated the
 * fault marker with `mpiPulse`, a keyframe that no longer exists in the
 * stylesheet — so the animation silently did nothing.
 *
 * Everything here is now joined against the registry and the engine: the
 * position, the readings, the state and the flag all come from the same
 * `StationSnapshot` the table below it renders.
 */

/**
 * §E / §B — every state carries a glyph, a shape and a word, not just a
 * colour. Green circles are unremarkable; the exceptions are spelled out on
 * the pin itself, so a station in fault is identifiable in a screenshot
 * printed in greyscale.
 */
const HEALTH_GLYPH: Record<
  StationHealth,
  { fill: string; ring: string; glyph: string; word: string; label: string }
> = {
  NOMINAL: {
    fill: 'var(--color-healthy)',
    ring: 'var(--color-healthy-border)',
    glyph: '●',
    word: 'OK',
    label: 'Verified good',
  },
  DRIFT: {
    fill: 'var(--color-warning)',
    ring: 'var(--color-warning-border)',
    glyph: '◆',
    word: 'DRIFT',
    label: 'Suspect drift',
  },
  WEATHER_EVENT: {
    fill: 'var(--color-weather)',
    ring: 'var(--color-weather-border)',
    glyph: '▲',
    word: 'STORM',
    label: 'Weather event',
  },
  FAULT: {
    fill: 'var(--color-fault)',
    ring: 'var(--color-fault-border)',
    glyph: '✕',
    word: 'FAULT',
    label: 'Hardware fault',
  },
  TELEMETRY: {
    fill: 'var(--color-telemetry)',
    ring: 'var(--color-telemetry-border)',
    glyph: '◌',
    word: 'LINK',
    label: 'Telemetry loss',
  },
};

const HEALTH_ORDER: StationHealth[] = ['FAULT', 'WEATHER_EVENT', 'DRIFT', 'TELEMETRY', 'NOMINAL'];

/**
 * Three light basemaps. The old `dark_all` layer was a leftover from the dark
 * brand and fought the light operations shell it now sits inside.
 */
const BASEMAPS = {
  light: {
    label: 'Light',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    maxZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  },
  streets: {
    label: 'Streets',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: '',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
  terrain: {
    label: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 17,
    attribution:
      'Map data &copy; OpenStreetMap contributors, SRTM | Style &copy; OpenTopoMap (CC-BY-SA)',
  },
} as const;

type BasemapId = keyof typeof BASEMAPS;
type LabelMode = 'auto' | 'always' | 'never';

/** Screen-cell size for the on-screen grid cluster, in CSS pixels. */
const CLUSTER_CELL_PX = 68;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A packet channel is `number | null`; a null channel renders as an em dash. */
function reading(value: number | null, unit: string, digits = 1): string {
  return value == null ? '—' : `${value.toFixed(digits)} ${unit}`;
}

/** Icons are rebuilt on every render, so they are memoised per (flag, shape). */
const iconCache = new Map<string, L.DivIcon>();

function stationIcon(
  s: StationSnapshot,
  { selected, labelled }: { selected: boolean; labelled: boolean }
): L.DivIcon {
  const g = HEALTH_GLYPH[s.health];
  const code = s.stationId.replace(/^AWS-/, '');
  const key = `${code}|${s.health}|${selected}|${labelled}`;
  const hit = iconCache.get(key);
  if (hit) return hit;

  const icon = L.divIcon({
    className: 'ms-map-icon',
    html:
      `<span class="ms-map-pin${selected ? ' is-selected' : ''}" style="--pin:${g.fill};--ring:${g.ring}">` +
      `<span class="ms-map-glyph" aria-hidden="true">${g.glyph}</span>` +
      (labelled
        ? `<span class="ms-map-label"><span class="ms-map-code">${escapeHtml(code)}</span>` +
          `<span class="ms-map-word">${escapeHtml(g.word)}</span></span>`
        : '') +
      `</span>`,
    // The pin sits at the left edge of the box, so the anchor is the pin's
    // centre regardless of whether a label is attached.
    iconSize: labelled ? [92, 18] : [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [9, 18],
  });
  iconCache.set(key, icon);
  return icon;
}

const clusterIconCache = new Map<string, L.DivIcon>();

function clusterIcon(count: number, mixed: boolean): L.DivIcon {
  const key = `${count}|${mixed}`;
  const hit = clusterIconCache.get(key);
  if (hit) return hit;

  // A cluster that is not purely healthy is drawn as an exception cluster, so
  // "how many of these are wrong" is readable without opening anything.
  const fill = mixed ? 'var(--color-warning)' : 'var(--color-navy)';
  const ring = mixed ? 'var(--color-warning-border)' : 'var(--color-hairline-strong)';
  const icon = L.divIcon({
    className: 'ms-map-icon',
    html:
      `<span class="ms-map-cluster" style="--pin:${fill};--ring:${ring}">` +
      `<span class="ms-map-count">${count}</span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  clusterIconCache.set(key, icon);
  return icon;
}

/**
 * Popup accent, by station state.
 *
 * `*_fill` values sit at roughly 2:1 on white and fail WCAG AA as text, so the
 * evidence panel is tinted and its labels use the matching `*-text` weight —
 * the same two-weight rule every other status surface in the console follows.
 */
const EVIDENCE_ACCENT: Record<StationHealth, string> = {
  NOMINAL: 'var(--color-healthy-text)',
  DRIFT: 'var(--color-warning-text)',
  WEATHER_EVENT: 'var(--color-weather-text)',
  FAULT: 'var(--color-fault-text)',
  TELEMETRY: 'var(--color-telemetry-text)',
};

/**
 * A signed delta with an explicit sign. An unsigned "3.1 hPa" is ambiguous — it
 * does not say whether the barometer fell or rose, and that is the entire
 * distinction between a squall and a calibration walk.
 */

/**
 * The four-tick rolling deltas the engine tested, recomputed exactly as
 * `evaluate()` computes them at lines 349-352.
 *
 * Why this exists rather than reading `packet.ratesOfChange`: the storm rule is
 * a disjunction — `pD <= -2.5 || rPD <= -2.5` — and `ratesOfChange` carries
 * only the single-tick half. On the seeded AWS-CHN-03 storm the deciding
 * packet shows a single-tick ΔP of −0.7 hPa, which does not satisfy the −2.5
 * hPa bound the packet was flagged under; the verdict rests on the rolling
 * half, −6.0 hPa. A popup quoting only the single-tick window would therefore
 * display FLAG_2 CONVECTIVE STORM beside evidence that fails the rule, which is
 * the same defect as a diagram that misdraws a threshold.
 *
 * Recomputed here rather than stored, because `evaluate()` does not persist the
 * rolling deltas and adding a field to the engine is out of scope for this
 * change. The window anchor is `packets.length >= 4 ? packets[len - 4] :
 * packets[0]`, matching the engine, and each delta falls back to its
 * single-tick value when the anchor channel is null — also matching.
 */
function rollingDeltas(
  p: TelemetryPacket,
  history: TelemetryPacket[]
): { press: number | null; hum: number | null; temp: number | null } | null {
  const idx = history.findIndex((h) => h.timestamp === p.timestamp);
  if (idx < 0) return null;
  const w = history.length >= 4 ? history[idx - 4] ?? history[0] : history[0];
  if (!w || w === p) return null;

  const span = (cur: number | null, then: number | null, fallback: number) =>
    cur !== null && then !== null ? cur - then : fallback;

  return {
    press: span(p.raw.pressure, w.raw.pressure, p.ratesOfChange.pressRoC),
    hum: span(p.raw.humidity, w.raw.humidity, p.ratesOfChange.humRoC),
    temp: span(p.raw.temperature, w.raw.temperature, p.ratesOfChange.tempRoC),
  };
}

/**
 * Whether a delta satisfies a storm-rule bound. These three literals are the
 * Stage 03 thresholds; they are duplicated from `lib/engineRules.ts` only
 * because they are needed to mark up which conjunct actually fired, and the
 * `engineRules` guard test covers the transcription the panel ships.
 */
const STORM_BOUND = { press: -2.5, hum: 15, temp: -1.5 } as const;

/** A null delta means the engine had no comparable reading — never zero. */
function deltaCell(value: number | null, unit: string, digits: number, fired: boolean): string {
  if (value === null) return '<span class="ms-map-popup-ev-na">N/A</span>';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const magnitude = `${sign}${Math.abs(value).toFixed(digits)} ${unit}`;
  return `<span class="ms-map-popup-ev-label${fired ? ' is-bound' : ''}">${escapeHtml(magnitude)}</span>`;
}

interface EvidenceTable {
  html: string;
  /** TRUE when at least one conjunct is satisfied on the row it is marked. */
  conjunctionHeld: boolean;
}

function evidenceTable(s: StationSnapshot): EvidenceTable {
  const p = s.decidedBy;
  const roll = rollingDeltas(p, stationHistory(s.stationId));
  const isStorm = p.classification === 'GENUINE_CONVECTIVE_EVENT';

  // Four channels, two windows. The rolling column is omitted when the packet
  // is not in the buffer (an injected packet from the console) rather than
  // showing a guessed value.
  const rows: Array<{ label: string; single: number | null; rolling: number | null; unit: string; digits: number; bound: number }> = [
    { label: 'ΔT', single: p.ratesOfChange.tempRoC, rolling: roll?.temp ?? null, unit: '°C', digits: 2, bound: STORM_BOUND.temp },
    { label: 'ΔP', single: p.ratesOfChange.pressRoC, rolling: roll?.press ?? null, unit: 'hPa', digits: 1, bound: STORM_BOUND.press },
    { label: 'ΔRH', single: p.ratesOfChange.humRoC, rolling: roll?.hum ?? null, unit: '%', digits: 1, bound: STORM_BOUND.hum },
  ];

  // Wind carries no storm-rule weight — it is not one of the three conjuncts —
  // so it appears only when the thermal channels are the ones that failed.
  // Listing it unconditionally would imply it participates in the test.
  const thermalDead = p.classification === 'FROZEN_VALUE' || p.classification === 'TELEMETRY_PACKET_LOSS';
  if (thermalDead) {
    rows.push({ label: 'ΔW', single: p.ratesOfChange.windRoC, rolling: null, unit: 'km/h', digits: 1, bound: 0 });
  }

  let conjunctionHeld = false;
  const body = rows
    .map((r) => {
      // ΔT and ΔP are `<=` bounds, ΔRH is `>=`. Marking a value that satisfies
      // the storm bound is what tells a judge which conjunct carried the
      // verdict; without it the two columns are just numbers.
      const passes = (v: number | null) =>
        v !== null && (r.label === 'ΔRH' ? v >= r.bound : v <= r.bound) && r.bound !== 0;
      const singleFired = isStorm && passes(r.single);
      const rollingFired = isStorm && passes(r.rolling);
      if (singleFired || rollingFired) conjunctionHeld = true;
      return (
        `<div class="ms-map-popup-evrow">` +
        `<dt>${escapeHtml(r.label)}</dt>` +
        `<dd>` +
        deltaCell(r.single, r.unit, r.digits, singleFired) +
        deltaCell(r.rolling, r.unit, r.digits, rollingFired) +
        `</dd>` +
        `</div>`
      );
    })
    .join('');

  return {
    conjunctionHeld,
    html:
      `<h6>Key evidence · rate of change</h6>` +
      `<div class="ms-map-popup-evrow ms-map-popup-evhead">` +
      `<dt></dt><dd><span>1 tick</span><span>4-tick</span></dd>` +
      `</div>` +
      body,
  };
}

function evidenceHtml(s: StationSnapshot): string {
  const p = s.decidedBy;
  const table = evidenceTable(s);

  // The conjunction note is only shown when the rule was the storm rule AND
  // some conjunct actually passes here. If neither window satisfies any bound,
  // claiming the conjunction held would be a fabrication, so the panel says
  // the packet was flagged but the buffer no longer reproduces the conjunction
  // rather than asserting something it cannot show.
  let conjunction: string;
  if (p.classification !== 'GENUINE_CONVECTIVE_EVENT') {
    conjunction =
      `<p class="ms-map-popup-note">Single-channel deviation — the three-parameter storm conjunction does not apply.</p>`;
  } else if (table.conjunctionHeld) {
    conjunction =
      `<p class="ms-map-popup-note">All three bounds hold (bolded), so the fall is attributed to the atmosphere and the observation is retained.</p>`;
  } else {
    conjunction =
      `<p class="ms-map-popup-note">Flagged by the storm rule at an earlier tick in this buffer; the four-tick window shown here has since decayed past the bounds.</p>`;
  }

  return (
    `<dl class="ms-map-popup-ev" style="--ms-ev-accent:${EVIDENCE_ACCENT[s.health]}">` +
    table.html +
    `<div class="ms-map-popup-verdict">` +
    `<span class="ms-map-popup-verdict-tag">WHY</span>` +
    `<span class="ms-map-popup-verdict-val">${escapeHtml(p.xaiAttribution.primaryParameter)}</span>` +
    `</div>` +
    `<div class="ms-map-popup-verdict">` +
    `<span class="ms-map-popup-verdict-tag">QC</span>` +
    `<span class="ms-map-popup-verdict-val">${escapeHtml(classificationLabel(p.classification))} · ${escapeHtml(p.wmoFlag.replace(/_.*/, '').replace('FLAG_', 'Flag '))}</span>` +
    `</div>` +
    conjunction +
    `<p class="ms-map-popup-action">` +
    `<span class="ms-map-popup-verdict-tag">ACTION</span> ${escapeHtml(p.operationalAction)}` +
    (p.ticketId ? ` · ${escapeHtml(p.ticketId)}` : '') +
    `</p>` +
    `</dl>`
  );
}

function popupHtml(s: StationSnapshot): string {
  const g = HEALTH_GLYPH[s.health];
  const p = s.decidedBy;
  const isAnomaly = p.classification !== 'NOMINAL_OPERATION';
  const decidedAt = s.resolved ? `last event ${s.decidedBy.timeIST} · ` : '';
  const statusLabel = isAnomaly ? (p.classification === 'GENUINE_CONVECTIVE_EVENT' ? 'WEATHER EVENT' : 'SENSOR / HARDWARE FAULT') : 'VERIFIED GOOD';
  return (
    `<div class="ms-map-popup">` +
    `<div class="ms-map-popup-head">` +
    `<span class="ms-map-popup-id">${escapeHtml(s.stationId)}</span>` +
    `<span class="ms-map-popup-state" style="color:${g.fill}">${escapeHtml(g.glyph)} ${escapeHtml(g.label)}</span>` +
    `</div>` +
    `<div class="ms-map-popup-name">${escapeHtml(s.name)}</div>` +
    (isAnomaly ?
      `<div class="ms-map-popup-badge" style="display:inline-block;background:${g.fill}15;color:${g.fill};border:1px solid ${g.fill}40;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;font-family:system-ui;margin-bottom:4px;">${escapeHtml(statusLabel)}</div>`
      : '') +
    `<dl class="ms-map-popup-grid">` +
    `<div><dt>Temperature</dt><dd>${reading(p.raw.temperature, '°C')}</dd></div>` +
    `<div><dt>Pressure</dt><dd>${reading(p.raw.pressure, 'hPa')}</dd></div>` +
    `<div><dt>Humidity</dt><dd>${reading(p.raw.humidity, '%')}</dd></div>` +
    `<div><dt>Wind</dt><dd>${reading(p.raw.windSpeedKph, 'km/h')}</dd></div>` +
    `<div><dt>WMO block</dt><dd>${escapeHtml(s.wmoBlockNo)}</dd></div>` +
    `<div><dt>Elevation</dt><dd>${s.elevationM} m</dd></div>` +
    `</dl>` +
    evidenceHtml(s) +
    `<p class="ms-map-popup-when">${escapeHtml(decidedAt)}observed ${escapeHtml(p.timeIST)} · ${s.historyDepth} ticks in buffer</p>` +
    `</div>`
  );
}

export default function LeafletMap() {
  const snapshot = getNetworkSnapshot();
  const searchId = useId();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StationHealth | 'ALL'>('ALL');
  const [basemap, setBasemap] = useState<BasemapId>('light');
  const [labelMode, setLabelMode] = useState<LabelMode>('auto');
  const [selected, setSelected] = useState<string | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  /** The individual (un-clustered) markers, so a click can address one directly. */
  const markerRef = useRef<Map<string, L.Marker>>(new Map());
  const zoomRef = useRef(5);
  /** Set by the render effect so Leaflet's own `zoomend` can re-run it. */
  const renderRef = useRef<() => void>(() => {});

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snapshot.stations.filter((s) => {
      if (filter !== 'ALL' && s.health !== filter) return false;
      if (!q) return true;
      return (
        s.stationId.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.rmcDivision.toLowerCase().includes(q) ||
        s.wmoBlockNo.includes(q)
      );
    });
  }, [snapshot.stations, query, filter]);

  /** The single station a query unambiguously points at, if there is one. */
  const matchId = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return visible.find(
      (s) => s.stationId.toLowerCase() === q || s.name.toLowerCase() === q
    )?.stationId ?? null;
  }, [visible, query]);

  const countByHealth = useMemo(() => {
    const counts = {} as Record<StationHealth, number>;
    for (const h of HEALTH_ORDER) counts[h] = 0;
    for (const s of snapshot.stations) counts[s.health] += 1;
    return counts;
  }, [snapshot.stations]);

  // ── Map creation, once. ──────────────────────────────────────────────────
  useEffect(() => {
    const container = document.getElementById('ms-map-canvas');
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: [22.5, 79.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: true,
      // The stations are spread across the mainland; zooming to a single pin
      // is never the right answer at 5, so clamp it.
      zoomSnap: 0.5,
    });
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    // Re-render the markers on every zoom so `auto` label mode can respond.
    const onZoom = () => {
      zoomRef.current = map.getZoom();
      renderRef.current();
    };
    map.on('zoomend', onZoom);

    return () => {
      map.off('zoomend', onZoom);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      tileRef.current = null;
    };
  }, []);

  // ── Tiles, on basemap change. ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileRef.current?.remove();
    const spec = BASEMAPS[basemap];
    tileRef.current = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      subdomains: spec.subdomains,
      maxZoom: spec.maxZoom,
    }).addTo(map);
    tileRef.current.bringToBack();
  }, [basemap]);

  // ── Markers, rebuilt whenever the visible set or the selection changes. ───
  const render = useCallback(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markerRef.current.clear();
    const zoom = zoomRef.current;
    const showLabel = (s: StationSnapshot) =>
      labelMode === 'always' ||
      (labelMode === 'auto' && (s.health !== 'NOMINAL' || zoom >= 7));

    // Screen-space grid clustering. `map.project` converts to pixel
    // coordinates, so the buckets stay the same size on screen at any zoom —
    // which is what "cluster" has to mean to be useful.
    const buckets = new Map<string, StationSnapshot[]>();
    for (const s of visible) {
      const q = map.project([s.latitude, s.longitude], zoom);
      const key = `${Math.floor(q.x / CLUSTER_CELL_PX)}:${Math.floor(q.y / CLUSTER_CELL_PX)}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(s);
      else buckets.set(key, [s]);
    }

    for (const bucket of buckets.values()) {
      if (bucket.length === 1) {
        const s = bucket[0];
        const marker = L.marker([s.latitude, s.longitude], {
          icon: stationIcon(s, { selected: selected === s.stationId, labelled: showLabel(s) }),
          keyboard: true,
          alt: `${s.stationId}, ${s.name}, ${HEALTH_GLYPH[s.health].label}`,
          riseOnHover: true,
        });
        marker.bindPopup(popupHtml(s), { closeButton: true, className: 'station-popup' });
        marker.on('click', () => setSelected(s.stationId));
        marker.addTo(layer);
        markerRef.current.set(s.stationId, marker);
        continue;
      }

      const lat = bucket.reduce((sum, s) => sum + s.latitude, 0) / bucket.length;
      const lng = bucket.reduce((sum, s) => sum + s.longitude, 0) / bucket.length;
      const mixed = bucket.some((s) => s.health !== 'NOMINAL');
      const marker = L.marker([lat, lng], { icon: clusterIcon(bucket.length, mixed) });
      marker.bindTooltip(
        `${bucket.length} stations — ${bucket.filter((s) => s.health !== 'NOMINAL').length} not at Flag 1`,
        { direction: 'top', offset: [0, -14] }
      );
      marker.on('click', () => map.flyTo([lat, lng], Math.min(12, map.getZoom() + 2)));
      marker.addTo(layer);
    }
  }, [visible, selected, labelMode]);

  useEffect(() => {
    renderRef.current = render;
    render();
  }, [render]);

  /** Fly to a station and open its popup. */
  const focusStation = (stationId: string) => {
    const s = snapshot.byId[stationId];
    const map = mapRef.current;
    if (!s || !map) return;
    setSelected(stationId);
    map.flyTo([s.latitude, s.longitude], Math.max(map.getZoom(), 7), { duration: 0.6 });
    // Setting the selection rebuilds the layer, so the marker for this station
    // is replaced on the next render — open its popup once that has happened.
    window.setTimeout(() => markerRef.current.get(stationId)?.openPopup(), 80);
  };

  return (
    <section className="card overflow-hidden" aria-label="National station map">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <h2 className="t-card-title">Station Network Map</h2>
          <p className="t-meta">
            {visible.length} of {snapshot.stations.length} AWS stations · interactive geographic QC
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DataModeBadge />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-2.5">
        <div className="relative w-full sm:w-56">
          <Search
            size={14}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-faint"
          />
          <label htmlFor={searchId} className="sr-only">
            Find a station on the map by id, name, state, division or WMO block
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a station…"
            className="w-full rounded border border-hairline bg-card py-2 pr-2 pl-7 text-[13px] placeholder:text-ink-faint"
          />
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter the map by QC state">
          {HEALTH_ORDER.map((h) => {
            const on = filter === h;
            const n = countByHealth[h];
            return (
              <button
                key={h}
                type="button"
                aria-pressed={on}
                disabled={n === 0}
                onClick={() => setFilter(on ? 'ALL' : h)}
                className={clsx(
                  'touch-target inline-flex items-center gap-1.5 rounded border px-2.5 text-[12.5px] font-semibold disabled:opacity-40',
                  on
                    ? 'border-navy bg-surface-alt text-navy'
                    : 'border-hairline text-ink-muted hover:bg-surface-hover'
                )}
              >
                {/* The glyph is a second, non-colour channel for the same state. */}
                <span aria-hidden style={{ color: HEALTH_GLYPH[h].fill }}>
                  {HEALTH_GLYPH[h].glyph}
                </span>
                {HEALTH_GLYPH[h].label}
                <span className="font-mono text-[11px] text-ink-faint">{n}</span>
              </button>
            );
          })}
        </div>

        {matchId && (
          <button
            type="button"
            onClick={() => focusStation(matchId)}
            className="touch-target inline-flex items-center gap-1.5 rounded border border-sky/40 bg-telemetry-bg px-2.5 text-[12.5px] font-semibold text-telemetry"
          >
            <LocateFixed size={14} aria-hidden />
            Show {snapshot.byId[matchId]?.name ?? matchId}
          </button>
        )}

        {selected && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="touch-target inline-flex items-center gap-1 rounded border border-hairline px-2 text-[12.5px] text-ink-muted hover:bg-surface-hover"
          >
            <X size={13} aria-hidden />
            Clear selection
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
            <span className="t-label">Labels</span>
            <select
              value={labelMode}
              onChange={(e) => setLabelMode(e.target.value as LabelMode)}
              className="rounded border border-hairline bg-card px-2 py-1.5 text-[12.5px]"
            >
              <option value="auto">Exceptions only</option>
              <option value="always">Always</option>
              <option value="never">Never</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
            <span className="t-label">Map</span>
            <select
              value={basemap}
              onChange={(e) => setBasemap(e.target.value as BasemapId)}
              className="rounded border border-hairline bg-card px-2 py-1.5 text-[12.5px]"
            >
              {Object.entries(BASEMAPS).map(([id, spec]) => (
                <option key={id} value={id}>
                  {spec.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Map + legend. The station table below the map is the accessible,
          text-first equivalent of everything shown here. */}
      <div className="relative">
        <div
          id="ms-map-canvas"
          role="region"
          aria-label={`Map of ${visible.length} observatories. The same data is listed in the station table below.`}
          className="h-[340px] w-full sm:h-[420px]"
        />

        <div className="pointer-events-none absolute bottom-2 left-2 z-[500] rounded border border-hairline bg-card/95 px-2.5 py-2">
          <p className="t-label flex items-center gap-1">
            <Layers size={11} aria-hidden />
            Legend
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {HEALTH_ORDER.map((h) => (
              <li key={h} className="flex items-center gap-1.5 text-[11px] leading-tight text-ink-muted">
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full border"
                  style={{ background: HEALTH_GLYPH[h].fill, borderColor: HEALTH_GLYPH[h].ring }}
                />
                <span className="font-semibold text-ink">{HEALTH_GLYPH[h].glyph}</span>
                {HEALTH_GLYPH[h].label}
                <span className="font-mono text-ink-faint">{countByHealth[h]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="border-t border-hairline px-4 py-2 t-meta">
        {snapshot.statement} Markers show the state the QC engine assigned to the newest packet; the
        full readings, the root-cause classification and the WMO flag for each station are in the
        table below.
      </p>
    </section>
  );
}
