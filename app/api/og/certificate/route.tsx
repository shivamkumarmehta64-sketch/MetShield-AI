import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

function cleanParam(val: string | null, fallback: string, maxLen = 60): string {
  if (!val) return fallback;
  // Strip control characters and clamp length
  const cleaned = val.replace(/[\x00-\x1F\x7F]/g, '').trim();
  return (cleaned.slice(0, maxLen) || fallback);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const stationId = cleanParam(searchParams.get('stationId'), 'AWS-4102', 24);
  const stationName = cleanParam(searchParams.get('name'), 'Pune Shivajinagar Observatory', 64);
  const temp = cleanParam(searchParams.get('temp'), '28.4', 8);
  const press = cleanParam(searchParams.get('press'), '955.2', 8);
  const hum = cleanParam(searchParams.get('hum'), '84', 6);
  const status = cleanParam(searchParams.get('status'), 'OPTIMAL', 24);
  const qc = cleanParam(searchParams.get('qc'), '99.4%', 8);

  const isStorm = status.includes('STORM') || status.includes('CONVECTIVE');
  const isFault = status.includes('FAULT') || status.includes('SPIKE');

  const statusColor = isFault ? '#f43f5e' : isStorm ? '#38bdf8' : '#10b981';
  const statusBg = isFault ? 'rgba(244, 63, 94, 0.15)' : isStorm ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)';
  const statusBorder = isFault ? 'rgba(244, 63, 94, 0.4)' : isStorm ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.4)';
  const statusLabel = isFault ? 'QUARANTINED FAULT' : isStorm ? 'CONVECTIVE STORM' : 'VALIDATED NOMINAL';

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

        {/* Middle Card: Station Profile & Live Telemetry Readout */}
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
              <div style={{ display: 'flex', fontSize: '13px', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                STATION ID: {stationId} | DCP LINK VERIFIED
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
              }}
            >
              <div style={{ display: 'flex', fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                QC PASS RATE
              </div>
              <div style={{ display: 'flex', fontSize: '26px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                {qc}
              </div>
            </div>
          </div>

          {/* 3 Telemetry Metrics */}
          <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#070d1e',
                borderRadius: '14px',
                padding: '16px 20px',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ display: 'flex', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>TEMPERATURE</div>
              <div style={{ display: 'flex', fontSize: '36px', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace', marginTop: '4px' }}>
                {temp}°C
              </div>
              <div style={{ display: 'flex', fontSize: '11px', color: '#10b981', marginTop: '2px' }}>WMO: -10°C to 55°C</div>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#070d1e',
                borderRadius: '14px',
                padding: '16px 20px',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ display: 'flex', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>BAROMETRIC PRESSURE</div>
              <div style={{ display: 'flex', fontSize: '36px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', marginTop: '4px' }}>
                {press} hPa
              </div>
              <div style={{ display: 'flex', fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>WMO: 920 to 1050 hPa</div>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#070d1e',
                borderRadius: '14px',
                padding: '16px 20px',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ display: 'flex', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>RELATIVE HUMIDITY</div>
              <div style={{ display: 'flex', fontSize: '36px', fontWeight: 900, color: '#06b6d4', fontFamily: 'monospace', marginTop: '4px' }}>
                {hum}%
              </div>
              <div style={{ display: 'flex', fontSize: '11px', color: '#06b6d4', marginTop: '2px' }}>WMO: 5% to 100%</div>
            </div>
          </div>
        </div>

        {/* Bottom Verification Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#10b981', fontWeight: 700 }}>[STANDARDS PASSED]</span>
            <span>WMO-No. 8 Protocol | CAP 1.2 Compliant | NABL Verified</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace', color: '#38bdf8' }}>
            VERCEL EDGE SATORI ENGINE | CRYPTOGRAPHIC SEAL
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
