import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

import { IMD_AWS_STATIONS, IMDStationProfile } from '@/lib/stationData';
import { SYNTHETIC_SUITE_LABEL, bench } from '@/lib/benchmarkResults';

/**
 * MetShield AI — shareable observatory certificate
 * =================================================
 * A shareable image is the single most screenshot-able artifact this project
 * produces, which is why every default on it used to be invented: a station
 * (`AWS-4102`) that is not in the registry, a name ("Pune Shivajinagar
 * Observatory") that is not any station's name, three plausible current
 * readings, and a `99.4%` QC figure that was never measured. Read at a glance
 * and cropped, that image said a passing grade about a station nobody has ever
 * heard of, from a score that does not exist.
 *
 * Every default below is now either a real registry entry or a real measured
 * number, and the image says on its face which is which. The two rules:
 *
 *  1. The station defaults to a real entry in `IMD_AWS_STATIONS`, read from the
 *     registry rather than retyped, so it cannot drift out of sync with it.
 *  2. A value is rendered as a reading only if a caller actually passed it. An
 *     absent parameter renders "NO OBSERVATION", not a number — because the
 *     alternative is a plausible-looking current reading that nobody measured.
 *     This image is generated from a URL; anything this route invents, a
 *     screenshot attributes to a station.
 *
 * The QC figure is the measured suite accuracy from `lib/benchmarkResults.ts`,
 * carried with the label that says it is a synthetic-suite benchmark and not
 * this station's grade.
 */

function cleanParam(val: string | null, fallback: string, maxLen = 60): string {
  if (!val) return fallback;
  // Strip control characters and clamp length
  const cleaned = val.replace(/[\x00-\x1F\x7F]/g, '').trim();
  return (cleaned.slice(0, maxLen) || fallback);
}

/**
 * A required reading, or `null` when the caller did not supply one.
 *
 * `cleanParam` is kept for its sanitisation and its length bounds, but its
 * `fallback` argument is the mechanism this file is being fixed for: it makes
 * an absent parameter render as an invented value. For a required reading the
 * fallback is the empty string and "empty" is mapped to `null` explicitly, so
 * the sanitisation still runs on whatever did arrive while nothing is invented
 * for what did not.
 */
function cleanReading(val: string | null, maxLen: number): string | null {
  const cleaned = cleanParam(val, '', maxLen);
  return cleaned === '' ? null : cleaned;
}

/**
 * Resolve the station to certify. An unrecognised `stationId` falls back to
 * the real default station rather than rendering the caller's string next to
 * the registry's name for a different station — or, as it used to, next to a
 * name that belongs to neither.
 */
function resolveStation(rawId: string | null): IMDStationProfile {
  const wanted = cleanParam(rawId, '', 24).toUpperCase();
  const match = wanted ? IMD_AWS_STATIONS.find((s) => s.stationId.toUpperCase() === wanted) : undefined;
  return match ?? IMD_AWS_STATIONS.find((s) => s.stationId === 'AWS-PUN-08') ?? IMD_AWS_STATIONS[0];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const station = resolveStation(searchParams.get('stationId'));
  // The name comes from the registry entry, not from the URL. A caller cannot
  // put one station's name on another station's card, and the string on the
  // image cannot drift away from `lib/stationData.ts`.
  const stationId = station.stationId;
  const stationName = station.name;

  // Present only if a caller actually passed them. `null` renders as
  // "NO OBSERVATION" on the image.
  const temp = cleanReading(searchParams.get('temp'), 8);
  const press = cleanReading(searchParams.get('press'), 8);
  const hum = cleanReading(searchParams.get('hum'), 6);

  // Status. The old default was the bare string `OPTIMAL` — a claim that a
  // station was in perfect condition, rendered on an image nobody had verified.
  // With no observation there is no status to report, so the honest default is
  // `UNVERIFIED` and the image says why.
  const statusParam = cleanParam(searchParams.get('status'), '', 24);
  const status = statusParam === '' ? 'UNVERIFIED' : statusParam;

  // The measured suite accuracy, formatted from the artifact. The old default
  // was a typed-in `99.4%`.
  const qc = `${(bench.accuracy * 100).toFixed(1)}%`;

  const isStorm = status.includes('STORM') || status.includes('CONVECTIVE');
  const isFault = status.includes('FAULT') || status.includes('SPIKE') || status.includes('QUARANTINED');
  // An unverified card is neither green nor a fault: it has nothing to report,
  // and colouring it "nominal" green is the same claim the old default made.
  const isUnverified = status === 'UNVERIFIED';

  const statusColor = isUnverified ? '#94a3b8' : isFault ? '#f43f5e' : isStorm ? '#38bdf8' : '#10b981';
  const statusBg = isUnverified ? 'rgba(148, 163, 184, 0.15)' : isFault ? 'rgba(244, 63, 94, 0.15)' : isStorm ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)';
  const statusBorder = isUnverified ? 'rgba(148, 163, 184, 0.4)' : isFault ? 'rgba(244, 63, 94, 0.4)' : isStorm ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.4)';
  const statusLabel = isUnverified
    ? 'UNVERIFIED — NO OBSERVATION'
    : isFault
      ? 'QUARANTINED FAULT'
      : isStorm
        ? 'CONVECTIVE STORM'
        : 'VALIDATED NOMINAL';

  const hasObservation = temp !== null || press !== null || hum !== null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#070d1e',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          position: 'relative',
          padding: '40px 50px',
          boxSizing: 'border-box',
          justifyContent: 'space-between',
        }}
      >
        {/* National 6px Tricolor Stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            display: 'flex',
            background: 'linear-gradient(to right, #FF9933 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #138808 66.6%)',
          }}
        />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
                border: '1.5px solid rgba(6, 182, 212, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                fontWeight: 900,
                fontSize: '20px',
              }}
            >
              M
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: '13px', color: '#94a3b8', letterSpacing: '2px', fontWeight: 700 }}>
                AUTOMATED WEATHER OBSERVATORY QUALITY ASSURANCE
              </div>
              <div style={{ display: 'flex', fontSize: '24px', fontWeight: 900, color: '#ffffff' }}>
                METSHIELD AI — NAWS-QMS v4.2
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 18px',
              borderRadius: '999px',
              backgroundColor: statusBg,
              border: `1.5px solid ${statusBorder}`,
              color: statusColor,
              fontWeight: 800,
              fontSize: '14px',
              letterSpacing: '1px',
            }}
          >
            {statusLabel}
          </div>
        </div>

        {/* Middle Card: Station Profile & Telemetry Readout */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0e1730',
            border: '1px solid #1e293b',
            borderRadius: '20px',
            padding: '28px 36px',
            gap: '20px',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* "DCP LINK VERIFIED" was an unconditional assertion on a card
                  rendered from nothing but a URL. It is now only said when a
                  caller actually passed a status, which is a caller-asserted
                  claim — and the station identity itself is from the registry. */}
              <div style={{ display: 'flex', fontSize: '13px', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                STATION ID: {stationId} | {station.state.toUpperCase()} | {hasObservation ? 'OBSERVATION SUPPLIED BY CALLER' : 'NO OBSERVATION SUPPLIED'}
              </div>
              <div style={{ display: 'flex', fontSize: '32px', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>
                {stationName}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                backgroundColor: '#070d1e',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid #334155',
                maxWidth: '460px',
              }}
            >
              {/* "QC PASS RATE" over a station-specific number was the most
                  screenshot-able false claim in the project: it read as this
                  station's grade. The label now says what the figure is. */}
              <div style={{ display: 'flex', fontSize: '11px', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>
                ENGINE ACCURACY — BENCHMARK, NOT THIS STATION
              </div>
              <div style={{ display: 'flex', fontSize: '26px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                {qc}
              </div>
              <div style={{ display: 'flex', fontSize: '10px', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>
                {SYNTHETIC_SUITE_LABEL}
              </div>
            </div>
          </div>

          
          {/* 3 Telemetry Metrics */}
          <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#070d1e', borderRadius: '14px', padding: '16px 20px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>TEMPERATURE</div>
              {temp === null ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: '#64748b', marginTop: '8px' }}>NO OBSERVATION</div>
                  <div style={{ display: 'flex', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Not passed to this renderer</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: '36px', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace', marginTop: '4px' }}>{temp}°C</div>
                  <div style={{ display: 'flex', fontSize: '11px', color: '#10b981', marginTop: '2px' }}>WMO range: -10°C to 55°C</div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#070d1e', borderRadius: '14px', padding: '16px 20px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>BAROMETRIC PRESSURE</div>
              {press === null ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: '#64748b', marginTop: '8px' }}>NO OBSERVATION</div>
                  <div style={{ display: 'flex', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Not passed to this renderer</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: '36px', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace', marginTop: '4px' }}>{press} hPa</div>
                  <div style={{ display: 'flex', fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>WMO range: 920 to 1050 hPa</div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#070d1e', borderRadius: '14px', padding: '16px 20px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>RELATIVE HUMIDITY</div>
              {hum === null ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: '#64748b', marginTop: '8px' }}>NO OBSERVATION</div>
                  <div style={{ display: 'flex', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Not passed to this renderer</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', fontSize: '36px', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace', marginTop: '4px' }}>{hum}%</div>
                  <div style={{ display: 'flex', fontSize: '11px', color: '#06b6d4', marginTop: '2px' }}>WMO range: 5% to 100%</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Verification Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b', width: '100%' }}>
          {/* The old footer asserted "[STANDARDS PASSED] WMO-No. 8 Protocol |
              CAP 1.2 Compliant | NABL Verified" and a "cryptographic seal" on
              an image that had verified nothing. Nothing on this card has been
              certified by anyone, so the footer names what it does instead. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 700 }}>[ENGINE LOGIC WRITTEN AGAINST]</span>
            <span>WMO-No. 8 flag definitions | NDMA CAP v1.2 alert levels — no certification performed</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace', color: '#38bdf8' }}>
            NICWMO ANOMALY ENGINE | REPRODUCE: npm run bench:qc
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
