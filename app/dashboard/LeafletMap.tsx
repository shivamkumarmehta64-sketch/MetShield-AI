'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { clsx } from 'clsx';
import { Layers, LocateFixed, Search, X } from 'lucide-react';
import {
  classificationLabel,
  getNetworkSnapshot,
  type StationHealth,
  type StationSnapshot,
} from '@/lib/networkFeed';
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

function popupHtml(s: StationSnapshot): string {
  const g = HEALTH_GLYPH[s.health];
  const p = s.packet;
  return (
    `<div class="ms-map-popup">` +
    `<div class="ms-map-popup-head">` +
    `<span class="ms-map-popup-id">${escapeHtml(s.stationId)}</span>` +
    `<span class="ms-map-popup-state" style="color:${g.fill}">${escapeHtml(g.glyph)} ${escapeHtml(g.label)}</span>` +
    `</div>` +
    `<div class="ms-map-popup-name">${escapeHtml(s.name)}</div>` +
    `<dl class="ms-map-popup-grid">` +
    `<div><dt>Temperature</dt><dd>${reading(p.raw.temperature, '°C')}</dd></div>` +
    `<div><dt>Pressure</dt><dd>${reading(p.raw.pressure, 'hPa')}</dd></div>` +
    `<div><dt>Humidity</dt><dd>${reading(p.raw.humidity, '%')}</dd></div>` +
    `<div><dt>Wind</dt><dd>${reading(p.raw.windSpeedKph, 'km/h')}</dd></div>` +
    `<div><dt>WMO block</dt><dd>${escapeHtml(s.wmoBlockNo)}</dd></div>` +
    `<div><dt>Elevation</dt><dd>${s.elevationM} m</dd></div>` +
    `</dl>` +
    `<p class="ms-map-popup-class">${escapeHtml(classificationLabel(s.classification))} · ${escapeHtml(s.wmoFlag.replace(/_.*/, '').replace('FLAG_', 'Flag '))}</p>` +
    `<p class="ms-map-popup-note">${escapeHtml(p.xaiAttribution.diagnosticNote)}</p>` +
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
